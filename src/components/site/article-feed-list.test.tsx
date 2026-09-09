import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ArticleFeedList } from "./article-feed-list";

const post = (id: number) => ({ id: String(id), slug: `guide-${id}`, title: `教學 ${id}`, excerpt: "摘要", publishedAt: new Date("2026-09-08"), category: { name: "AI 教學", slug: "ai", parent: null } });
const ad = { mode: "preview" as const, placement: "category_inline" as const, shape: "rectangle" as const };

describe("ArticleFeedList", () => {
  it("inserts an inline ad only when another article follows its interval", () => {
    const { rerender } = render(<ArticleFeedList posts={[post(1), post(2)]} locale="zh-tw" dictionary={getDictionary("zh-tw")} adInterval={2} inlineAdConfig={ad} />);
    expect(screen.queryByTestId("ad-preview-category_inline")).not.toBeInTheDocument();

    rerender(<ArticleFeedList posts={[post(1), post(2), post(3)]} locale="zh-tw" dictionary={getDictionary("zh-tw")} adInterval={2} inlineAdConfig={ad} />);
    expect(screen.getAllByTestId("ad-preview-category_inline")).toHaveLength(1);
    expect(screen.getByText("教學 2").closest("li")?.nextElementSibling).toHaveClass("category-feed-ad");
  });
});
