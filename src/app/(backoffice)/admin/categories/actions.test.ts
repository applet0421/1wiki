import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "./actions";

const {
  getCurrentUser,
  createCategory,
  updateCategory,
  deleteCategory,
  revalidatePath,
  redirect,
} = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/content/repository", () => ({ createCategory, updateCategory, deleteCategory }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

describe("category actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "owner-1" });
  });

  it("creates a nested category with hierarchy settings", async () => {
    const form = new FormData();
    form.set("locale", "zh-tw");
    form.set("name", "ChatGPT");
    form.set("slug", "chatgpt");
    form.set("description", "使用教學");
    form.set("parentId", "ai");
    form.set("sortOrder", "7");

    await expect(createCategoryAction(form)).rejects.toThrow(
      "redirect:/admin/categories?locale=zh-tw&success=created",
    );
    expect(createCategory).toHaveBeenCalledWith({}, {
      locale: "zh-tw",
      name: "ChatGPT",
      slug: "chatgpt",
      description: "使用教學",
      parentId: "ai",
      showInNavigation: false,
      sortOrder: 7,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("updates a root category and its navigation setting", async () => {
    const form = new FormData();
    form.set("id", "ai");
    form.set("locale", "en");
    form.set("name", "AI Guides");
    form.set("slug", "ai-guides");
    form.set("showInNavigation", "on");
    form.set("sortOrder", "2");

    await expect(updateCategoryAction(form)).rejects.toThrow(
      "redirect:/admin/categories?locale=en&success=updated",
    );
    expect(updateCategory).toHaveBeenCalledWith({}, "ai", expect.objectContaining({
      locale: "en",
      parentId: null,
      showInNavigation: true,
      sortOrder: 2,
    }));
  });

  it("preserves the selected locale after deleting a category", async () => {
    const form = new FormData();
    form.set("id", "leaf");
    form.set("locale", "ja");

    await expect(deleteCategoryAction(form)).rejects.toThrow(
      "redirect:/admin/categories?locale=ja&success=deleted",
    );
    expect(deleteCategory).toHaveBeenCalledWith({}, "leaf");
  });

  it("redirects unauthenticated users before writing", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    await expect(createCategoryAction(new FormData())).rejects.toThrow("redirect:/login");
    expect(createCategory).not.toHaveBeenCalled();
  });
});
