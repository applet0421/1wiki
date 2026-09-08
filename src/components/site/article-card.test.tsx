import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ArticleCard } from "./article-card";

describe("ArticleCard", () => {
  it("renders a cover image on the left when one is available", () => {
    render(<ArticleCard locale="zh-tw" dictionary={getDictionary("zh-tw")} post={{
      slug: "with-cover",
      title: "With cover",
      excerpt: "摘要",
      publishedAt: null,
      coverImage: "https://example.com/cover.jpg",
      category: { name: "AI", slug: "ai", parent: null },
    }} />);

    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(screen.getByRole("article")).toHaveClass("has-cover");
  });

  it("links the article category through its full ancestor path", () => {
    render(<ArticleCard locale="zh-tw" dictionary={getDictionary("zh-tw")} post={{
      slug: "leaf-article",
      title: "Leaf article",
      excerpt: "摘要",
      publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: {
        name: "Prompt",
        slug: "prompt",
        parent: {
          name: "ChatGPT",
          slug: "chatgpt",
          parent: { name: "AI", slug: "ai", parent: null },
        },
      },
    }} />);

    expect(screen.getByRole("link", { name: "Prompt" })).toHaveAttribute(
      "href",
      "/zh-tw/category/ai/chatgpt/prompt",
    );
  });

  it("exposes dedicated hooks for the card title, excerpt, and metadata", () => {
    render(<ArticleCard locale="zh-tw" dictionary={getDictionary("zh-tw")} post={{
      slug: "hierarchy",
      title: "文章標題",
      excerpt: "文章摘要",
      publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "AI", slug: "ai", parent: null },
    }} />);

    expect(screen.getByRole("heading", { name: "文章標題" })).toHaveClass("article-card-title");
    expect(screen.getByRole("link", { name: "文章標題" })).toHaveClass("article-card-title-link");
    expect(screen.getByText("文章摘要")).toHaveClass("article-card-excerpt");
    expect(screen.getByText("2026年9月3日").parentElement).toHaveClass("article-card-meta");
  });
});
