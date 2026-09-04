import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildCategoryTree, type CategoryRow } from "@/lib/content/category-tree";
import { CategoryManager } from "./category-manager";

const categories = buildCategoryTree([
  { id: "root", locale: "zh-tw", name: "AI", slug: "ai", description: "", parentId: null, sortOrder: 1, showInNavigation: true, directPostCount: 1 },
  { id: "child", locale: "zh-tw", name: "ChatGPT", slug: "chatgpt", description: "", parentId: "root", sortOrder: 0, showInNavigation: false, directPostCount: 0 },
  { id: "leaf", locale: "zh-tw", name: "Prompt", slug: "prompt", description: "", parentId: "child", sortOrder: 0, showInNavigation: false, directPostCount: 0 },
] satisfies CategoryRow[]);
const actions = {
  createAction: async () => undefined,
  updateAction: async () => undefined,
  deleteAction: async () => undefined,
};

describe("CategoryManager", () => {
  it("renders a category tree with paths, counts, and valid parent choices", () => {
    render(<CategoryManager locale="zh-tw" categories={categories} feedback={null} {...actions} />);
    const createForm = screen.getByRole("heading", { name: "建立分類" }).closest("form");

    expect(createForm).not.toBeNull();
    const create = within(createForm!);

    expect(screen.getByRole("heading", { name: "AI" })).toBeInTheDocument();
    expect(screen.getByText("/zh-tw/category/ai/chatgpt")).toBeInTheDocument();
    expect(screen.getByText("1 篇直屬／1 篇合計")).toBeInTheDocument();
    expect(create.getByRole("option", { name: "— ChatGPT" })).toBeInTheDocument();
    expect(create.queryByRole("option", { name: "—— Prompt" })).not.toBeInTheDocument();
  });

  it("only shows navigation settings for root categories", () => {
    render(<CategoryManager locale="zh-tw" categories={categories} feedback={null} {...actions} />);
    const createForm = screen.getByRole("heading", { name: "建立分類" }).closest("form");

    expect(createForm).not.toBeNull();
    const create = within(createForm!);

    expect(create.getByLabelText("顯示於頂部導覽")).toBeInTheDocument();
    fireEvent.change(create.getByLabelText("上層分類"), { target: { value: "child" } });
    expect(create.queryByLabelText("顯示於頂部導覽")).not.toBeInTheDocument();
  });

  it("preselects a category when adding its child", () => {
    render(<CategoryManager locale="zh-tw" categories={categories} feedback={null} {...actions} />);
    const createForm = screen.getByRole("heading", { name: "建立分類" }).closest("form");

    expect(createForm).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "新增 AI 的子分類" }));
    expect(within(createForm!).getByLabelText("上層分類")).toHaveValue("root");
  });

  it("disables deletion and explains whether posts or children block it", () => {
    render(<CategoryManager locale="zh-tw" categories={categories} feedback={null} {...actions} />);

    expect(screen.getByRole("button", { name: "刪除 AI" })).toBeDisabled();
    expect(screen.getByText("分類仍有文章，無法刪除")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刪除 ChatGPT" })).toBeDisabled();
    expect(screen.getByText("分類仍有子分類，無法刪除")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刪除 Prompt" })).toBeEnabled();
  });
});
