import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

vi.mock("@/lib/content/repository", () => ({
  listAdminPosts: vi.fn(async () => []),
  listCategories: vi.fn(async () => [
    { id: "cat-zh", locale: "zh-tw", name: "AI 教學", slug: "ai", description: null, _count: { posts: 1 } },
    { id: "cat-en", locale: "en", name: "AI Guides", slug: "ai", description: null, _count: { posts: 1 } },
  ]),
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

  it("passes a valid locale filter to the repository", async () => {
    const { listAdminPosts } = await import("@/lib/content/repository");
    render(await AdminPage({ searchParams: Promise.resolve({ locale: "en" }) }));
    expect(listAdminPosts).toHaveBeenCalledWith({}, "en", undefined);
    expect(screen.getByLabelText("內容語系")).toHaveValue("en");
  });

  it("filters posts by a category belonging to the selected locale", async () => {
    const { listAdminPosts } = await import("@/lib/content/repository");
    render(await AdminPage({ searchParams: Promise.resolve({ locale: "en", category: "cat-en" }) }));

    expect(screen.getByLabelText("文章分類")).toHaveValue("cat-en");
    expect(screen.queryByRole("option", { name: "AI 教學" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "AI Guides" })).toBeInTheDocument();
    expect(listAdminPosts).toHaveBeenCalledWith({}, "en", "cat-en");
  });
});
