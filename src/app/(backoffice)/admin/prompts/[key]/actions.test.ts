import { beforeEach, describe, expect, it, vi } from "vitest";
import { restorePromptAction, savePromptAction } from "./actions";

const { getCurrentUser, createPromptVersion, restorePromptVersion, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createPromptVersion: vi.fn(),
  restorePromptVersion: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/prompt-repository", () => ({ createPromptVersion, restorePromptVersion }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

describe("Prompt actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects editors before writing a new version", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "editor-1", role: "EDITOR", isActive: true });
    await expect(savePromptAction("ARTICLE_GENERATE", new FormData())).rejects.toThrow("權限不足");
    expect(createPromptVersion).not.toHaveBeenCalled();
  });

  it("creates a new owner-authored version and redirects", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "owner-1", role: "OWNER", isActive: true });
    createPromptVersion.mockResolvedValueOnce({ versionNumber: 2 });
    const form = new FormData();
    form.set("baseVersionNumber", "1");
    form.set("systemTemplate", "系統");
    form.set("userTemplate", "主題：{{topic}}");
    await expect(savePromptAction("ARTICLE_GENERATE", form)).rejects.toThrow("redirect:/admin/prompts/ARTICLE_GENERATE?success=saved");
    expect(createPromptVersion).toHaveBeenCalledWith({}, expect.objectContaining({ createdById: "owner-1", baseVersionNumber: 1 }));
  });

  it("restores history as another new version", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "owner-1", role: "OWNER", isActive: true });
    restorePromptVersion.mockResolvedValueOnce({ versionNumber: 3 });
    const form = new FormData();
    form.set("baseVersionNumber", "2");
    form.set("sourceVersionNumber", "1");
    await expect(restorePromptAction("ARTICLE_GENERATE", form)).rejects.toThrow("redirect:/admin/prompts/ARTICLE_GENERATE?success=restored");
    expect(restorePromptVersion).toHaveBeenCalledWith({}, expect.objectContaining({ sourceVersionNumber: 1, baseVersionNumber: 2 }));
  });
});
