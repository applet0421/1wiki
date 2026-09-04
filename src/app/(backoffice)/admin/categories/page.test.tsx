import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CategoriesPage from "./page";

const { listCategories } = vi.hoisted(() => ({ listCategories: vi.fn() }));

vi.mock("@/lib/content/repository", () => ({
  listCategories,
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("CategoriesPage", () => {
  it("renders the selected locale as a hierarchical category tree", async () => {
    listCategories.mockResolvedValueOnce([
      { id: "root", locale: "en", name: "AI", slug: "ai", description: null, parentId: null, sortOrder: 0, showInNavigation: true, _count: { posts: 1 } },
      { id: "child", locale: "en", name: "ChatGPT", slug: "chatgpt", description: "Guides", parentId: "root", sortOrder: 0, showInNavigation: false, _count: { posts: 2 } },
    ]);

    render(await CategoriesPage({ searchParams: Promise.resolve({ locale: "en", success: "updated" }) }));

    expect(listCategories).toHaveBeenCalledWith({}, "en");
    expect(screen.getByLabelText("內容語系")).toHaveValue("en");
    expect(screen.getByText("分類已更新。")).toBeInTheDocument();
    expect(screen.getByText("/en/category/ai/chatgpt")).toBeInTheDocument();
    expect(screen.getByText("1 篇直屬／3 篇合計")).toBeInTheDocument();
  });
});
