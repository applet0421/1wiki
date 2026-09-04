import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PromptsPage from "./page";

const { redirect, getCurrentUser, listPromptDefinitions } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
  getCurrentUser: vi.fn(),
  listPromptDefinitions: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/prompt-repository", () => ({ listPromptDefinitions }));

describe("PromptsPage", () => {
  it("redirects editors before reading Prompt data", async () => {
    getCurrentUser.mockResolvedValueOnce({ role: "EDITOR" });
    await expect(PromptsPage()).rejects.toThrow("redirect:/admin");
    expect(listPromptDefinitions).not.toHaveBeenCalled();
  });

  it("shows active versions to owners", async () => {
    getCurrentUser.mockResolvedValueOnce({ role: "OWNER" });
    listPromptDefinitions.mockResolvedValueOnce([{
      id: "prompt-1",
      key: "ARTICLE_GENERATE",
      name: "一般文章生成",
      description: "依主題生成文章",
      activeVersionNumber: 2,
      updatedAt: new Date("2026-09-04T10:00:00Z"),
    }]);
    render(await PromptsPage());
    expect(screen.getByRole("heading", { name: "Prompt 管理" })).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "編輯" })).toHaveAttribute("href", "/admin/prompts/ARTICLE_GENERATE");
  });
});
