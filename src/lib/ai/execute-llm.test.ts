import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AIProviderError } from "./errors";
import { executeLLMCall } from "./execute-llm";

const activePrompt = {
  definitionId: "definition-1",
  versionId: "version-2",
  key: "ARTICLE_GENERATE" as const,
  name: "一般文章生成",
  description: "生成",
  allowedVariables: ["topic", "keyword", "languageInstruction", "instructions"],
  requiredVariables: ["topic", "keyword", "languageInstruction", "instructions"],
  versionNumber: 2,
  systemTemplate: "系統：{{languageInstruction}}",
  userTemplate: "主題：{{topic}}；關鍵字：{{keyword}}；{{instructions}}",
};

function dependencies() {
  const times = [new Date("2026-09-04T10:00:00.000Z"), new Date("2026-09-04T10:00:00.125Z")];
  return {
    client: {} as PrismaClient,
    env: { LLM_PROVIDER: "openai", OPENAI_API_KEY: "secret", OPENAI_MODEL: "gpt-5" },
    now: () => times.shift() || new Date("2026-09-04T10:00:00.125Z"),
    getPrompt: vi.fn(async () => activePrompt),
    findPrice: vi.fn(async () => null),
    recordUsage: vi.fn(async () => undefined),
    callProvider: vi.fn(async () => ({
      value: "完成",
      usage: { inputTokens: 20, outputTokens: 5, totalTokens: 25 },
    })),
    onAuditError: vi.fn(),
  };
}

describe("executeLLMCall", () => {
  it("renders the active version and audits successful usage", async () => {
    const deps = dependencies();
    await expect(executeLLMCall({
      key: "ARTICLE_GENERATE",
      variables: { topic: "登入", keyword: "修復", languageInstruction: "繁中", instructions: "清楚回答" },
      jsonSchema: { type: "object" },
      schemaName: "article",
      parse: (value) => String(value),
    }, deps)).resolves.toBe("完成");

    expect(deps.callProvider).toHaveBeenCalledWith(expect.objectContaining({
      provider: "openai",
      systemPrompt: "系統：繁中",
      prompt: "主題：登入；關鍵字：修復；清楚回答",
    }));
    expect(deps.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
      status: "SUCCESS",
      promptDefinitionId: "definition-1",
      promptVersionId: "version-2",
      durationMs: 125,
    }));
  });

  it("audits provider failure and rethrows the original error", async () => {
    const deps = dependencies();
    const failure = new AIProviderError("rate_limit");
    failure.usage = { inputTokens: 7, outputTokens: 0, totalTokens: 7 };
    deps.callProvider.mockRejectedValueOnce(failure);

    await expect(executeLLMCall({
      key: "ARTICLE_GENERATE",
      variables: { topic: "登入", keyword: "修復", languageInstruction: "繁中", instructions: "清楚回答" },
      jsonSchema: { type: "object" },
      schemaName: "article",
      parse: (value) => value,
    }, deps)).rejects.toBe(failure);
    expect(deps.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
      status: "FAILURE",
      usage: { inputTokens: 7, outputTokens: 0, totalTokens: 7 },
      error: failure,
    }));
  });

  it("does not replace a successful result when audit persistence fails", async () => {
    const deps = dependencies();
    const auditFailure = new Error("database unavailable");
    deps.recordUsage.mockRejectedValueOnce(auditFailure);

    await expect(executeLLMCall({
      key: "ARTICLE_GENERATE",
      variables: { topic: "登入", keyword: "修復", languageInstruction: "繁中", instructions: "清楚回答" },
      jsonSchema: { type: "object" },
      schemaName: "article",
      parse: (value) => value,
    }, deps)).resolves.toBe("完成");
    expect(deps.onAuditError).toHaveBeenCalledWith(auditFailure);
  });
});
