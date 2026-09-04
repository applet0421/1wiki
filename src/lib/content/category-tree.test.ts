import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  flattenCategoryOptions,
  getCategoryHref,
  type CategoryRow,
} from "./category-tree";

const rows = [
  { id: "root", locale: "zh-tw", name: "AI", slug: "ai", description: "", parentId: null, sortOrder: 1, showInNavigation: true, directPostCount: 1 },
  { id: "child", locale: "zh-tw", name: "ChatGPT", slug: "chatgpt", description: "", parentId: "root", sortOrder: 0, showInNavigation: false, directPostCount: 2 },
  { id: "leaf", locale: "zh-tw", name: "Prompt", slug: "prompt", description: "", parentId: "child", sortOrder: 0, showInNavigation: false, directPostCount: 3 },
] satisfies CategoryRow[];

describe("category tree", () => {
  it("builds complete segments and aggregate post counts", () => {
    const root = buildCategoryTree(rows)[0];

    expect(root.children[0].children[0].segments).toEqual(["ai", "chatgpt", "prompt"]);
    expect(root.aggregatePostCount).toBe(6);
  });

  it("orders siblings by sort order and then name", () => {
    const siblings = [
      { ...rows[0], id: "software", name: "Software", slug: "software", sortOrder: 2 },
      { ...rows[0], id: "ai", name: "AI", slug: "ai", sortOrder: 1 },
      { ...rows[0], id: "devices", name: "Devices", slug: "devices", sortOrder: 2 },
    ];

    expect(buildCategoryTree(siblings).map(({ name }) => name)).toEqual(["AI", "Devices", "Software"]);
  });

  it("formats selectable labels for every level", () => {
    expect(flattenCategoryOptions(buildCategoryTree(rows)).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "root", label: "AI" },
      { id: "child", label: "— ChatGPT" },
      { id: "leaf", label: "—— Prompt" },
    ]);
  });

  it("builds one canonical href shape", () => {
    expect(getCategoryHref("zh-tw", ["ai", "chatgpt", "prompt"])).toBe("/zh-tw/category/ai/chatgpt/prompt");
  });

  it("rejects orphaned and cyclic rows", () => {
    expect(() => buildCategoryTree([{ ...rows[1], parentId: "missing" }])).toThrow("分類資料包含無效的父子關係");
    expect(() => buildCategoryTree([
      { ...rows[0], id: "a", parentId: "b" },
      { ...rows[1], id: "b", parentId: "a" },
    ])).toThrow("分類資料包含無效的父子關係");
  });
});
