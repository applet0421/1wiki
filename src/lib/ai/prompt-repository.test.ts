import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createPromptVersion, restorePromptVersion } from "./prompt-repository";

function fakeClient(options: { conflict?: boolean } = {}) {
  const state = {
    activeVersionNumber: 1,
    versions: [
      { id: "version-1", versionNumber: 1, systemTemplate: "系統", userTemplate: "主題：{{topic}}" },
    ],
  };
  const definition = {
    id: "definition-1",
    key: "ARTICLE_GENERATE",
    name: "一般文章生成",
    description: "生成文章",
    allowedVariables: ["topic"],
    requiredVariables: ["topic"],
  };
  const client = {
    promptDefinition: {
      findUnique: async () => ({ ...definition, activeVersionNumber: state.activeVersionNumber, versions: state.versions }),
      updateMany: async () => {
        if (options.conflict) return { count: 0 };
        state.activeVersionNumber += 1;
        return { count: 1 };
      },
    },
    promptVersion: {
      create: async ({ data }: { data: { versionNumber: number; systemTemplate: string; userTemplate: string } }) => {
        const version = { id: `version-${data.versionNumber}`, ...data };
        state.versions.push(version);
        return version;
      },
      findFirst: async ({ where }: { where: { versionNumber: number } }) =>
        state.versions.find((version) => version.versionNumber === where.versionNumber) || null,
    },
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback(client),
  };
  return { client: client as unknown as PrismaClient, state };
}

describe("Prompt repository", () => {
  it("creates and activates the next immutable version", async () => {
    const { client, state } = fakeClient();
    const result = await createPromptVersion(client, {
      key: "ARTICLE_GENERATE",
      baseVersionNumber: 1,
      systemTemplate: "新系統",
      userTemplate: "新主題：{{topic}}",
      createdById: "owner-1",
    });

    expect(result).toMatchObject({ versionNumber: 2, systemTemplate: "新系統", userTemplate: "新主題：{{topic}}" });
    expect(state.activeVersionNumber).toBe(2);
    expect(state.versions[0].userTemplate).toBe("主題：{{topic}}");
  });

  it("rejects a stale update instead of silently replacing the active version", async () => {
    const { client } = fakeClient({ conflict: true });
    await expect(createPromptVersion(client, {
      key: "ARTICLE_GENERATE",
      baseVersionNumber: 1,
      systemTemplate: "新系統",
      userTemplate: "新主題：{{topic}}",
      createdById: "owner-1",
    })).rejects.toThrow("Prompt 已被其他管理員更新，請重新載入。");
  });

  it("restores old text as a new version", async () => {
    const { client, state } = fakeClient();
    await createPromptVersion(client, {
      key: "ARTICLE_GENERATE",
      baseVersionNumber: 1,
      systemTemplate: "新版",
      userTemplate: "新版：{{topic}}",
      createdById: "owner-1",
    });

    const restored = await restorePromptVersion(client, {
      key: "ARTICLE_GENERATE",
      sourceVersionNumber: 1,
      baseVersionNumber: 2,
      createdById: "owner-1",
    });

    expect(restored).toMatchObject({ versionNumber: 3, systemTemplate: "系統", userTemplate: "主題：{{topic}}" });
    expect(state.versions.map((version) => version.versionNumber)).toEqual([1, 2, 3]);
  });
});
