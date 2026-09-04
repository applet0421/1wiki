import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CategoryPageContent } from "./category-page";

describe("CategoryPageContent", () => {
  it("renders child links, breadcrumbs, and descendant articles", () => {
    render(<CategoryPageContent locale="zh-tw" dictionary={getDictionary("zh-tw")} data={{
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" },
      ancestors: [],
      children: [{ id: "child", name: "ChatGPT", slug: "chatgpt", description: "對話式 AI", aggregatePostCount: 1 }],
      posts: [{
        id: "post", slug: "leaf-article", title: "Leaf article", excerpt: "摘要",
        publishedAt: new Date("2026-09-03T00:00:00Z"),
        category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
      }],
    }} />);

    expect(screen.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
    expect(screen.getByText("Leaf article")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("AI"))
      .toHaveAttribute("aria-current", "page");
  });
});
