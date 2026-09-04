import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

vi.mock("@/lib/content/repository", () => ({
  listAdminPosts: vi.fn(async () => []),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

describe("AdminPage", () => {
  it("places AI generation and rewrite entries before the standard new-post entry", async () => {
    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    const actions = screen.getAllByRole("link").filter((link) =>
      ["AI 生成", "AI 改寫文章", "新增文章"].includes(link.textContent || ""),
    );
    expect(actions.map((link) => link.textContent)).toEqual(["AI 生成", "AI 改寫文章", "新增文章"]);
    expect(screen.getByRole("link", { name: "AI 生成" })).toHaveAttribute("href", "/admin/posts/generate");
    expect(screen.getByRole("link", { name: "AI 改寫文章" })).toHaveAttribute("href", "/admin/posts/rewrite");
  });
});
