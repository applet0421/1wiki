import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CategoryArticleList } from "./category-article-list";

describe("CategoryArticleList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not insert an Inline ad when exactly ten articles are loaded", () => {
    const posts = Array.from({ length: 10 }, (_, index) => ({
      id: `post-${index}`, slug: `guide-${index}`, title: `教學 ${index}`, excerpt: "摘要", publishedAt: null,
      category: { name: "AI", slug: "ai", parent: null },
    }));

    render(<CategoryArticleList
      initialPosts={posts}
      locale="zh-tw"
      dictionary={getDictionary("zh-tw")}
      path="ai"
      adInterval={10}
      inlineAdConfig={{ mode: "preview", placement: "category_inline", shape: "rectangle" }}
    />);

    expect(screen.queryByTestId("ad-preview-category_inline")).not.toBeInTheDocument();
  });

  it("inserts an Inline ad after ten articles when a later article is loaded", () => {
    const posts = Array.from({ length: 11 }, (_, index) => ({
      id: `post-${index}`, slug: `guide-${index}`, title: `教學 ${index}`, excerpt: "摘要", publishedAt: null,
      category: { name: "AI", slug: "ai", parent: null },
    }));

    render(<CategoryArticleList
      initialPosts={posts}
      locale="zh-tw"
      dictionary={getDictionary("zh-tw")}
      path="ai"
      adInterval={10}
      inlineAdConfig={{ mode: "preview", placement: "category_inline", shape: "rectangle" }}
    />);

    expect(screen.getAllByTestId("ad-preview-category_inline")).toHaveLength(1);
    expect(screen.getByText("教學 9").closest("li")?.nextElementSibling).toHaveClass("category-feed-ad");
  });

  it("does not show a completion message after the final page loads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ posts: [], hasMore: false }) }));
    vi.stubGlobal("IntersectionObserver", class {
      private readonly callback: IntersectionObserverCallback;

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }

      observe() {
        queueMicrotask(() => void this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
      }

      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "";
      thresholds = [];
    });

    render(<CategoryArticleList
      initialPosts={[{ id: "post", slug: "guide", title: "教學", excerpt: "摘要", publishedAt: null, category: { name: "AI", slug: "ai", parent: null } }]}
      locale="zh-tw"
      dictionary={getDictionary("zh-tw")}
      path="ai"
      inlineAdConfig={null}
    />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText("已載入全部文章")).not.toBeInTheDocument();
  });
});
