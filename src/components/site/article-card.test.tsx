import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ArticleCard } from "./article-card";

describe("ArticleCard", () => {
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
});
