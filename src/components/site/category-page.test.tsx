import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
      sitePages: [],
    }} />);

    expect(screen.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
    expect(screen.getByText("Leaf article")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("AI"))
      .toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "文章列表" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("category-article-item");
  });

  it("places category ads around a sufficiently long article list", () => {
    vi.stubEnv("NODE_ENV", "development");
    const posts = Array.from({ length: 11 }, (_, index) => ({
      id: `post-${index}`, slug: `article-${index}`, title: `Article ${index}`, excerpt: "摘要",
      publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }));
    render(<CategoryPageContent locale="zh-tw" dictionary={getDictionary("zh-tw")} data={{
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" }, ancestors: [], children: [], posts, sitePages: [],
    }} />);
    expect(screen.getByTestId("ad-preview-category_after_intro")).toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_inline")).toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_end")).toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_sidebar_desktop")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("renders mounted site pages in a separate About block", () => {
    render(<CategoryPageContent locale="zh-tw" dictionary={getDictionary("zh-tw")} data={{
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" }, ancestors: [], children: [], posts: [],
      sitePages: [{ id: "page", title: "關於 1Wiki", slug: "about", excerpt: "介紹" }],
    }} />);

    const about = screen.getByRole("region", { name: "About" });
    expect(within(about).queryByText("網站資訊")).not.toBeInTheDocument();
    expect(within(about).queryByText("1 個頁面")).not.toBeInTheDocument();
    expect(within(about).getByRole("link", { name: /關於 1Wiki/ })).toHaveAttribute("href", "/zh-tw/about");
    expect(within(about).getByRole("list")).toHaveClass("category-site-pages-list");
    expect(within(about).getByRole("listitem")).toHaveClass("category-site-page-item");
  });
});
