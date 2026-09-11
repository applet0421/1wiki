import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage, { dynamic, revalidate } from "./page";

const { listPublishedPosts } = vi.hoisted(() => ({
  listPublishedPosts: vi.fn(),
}));

vi.mock("@/lib/content/repository", () => ({ listPublishedPosts }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/adsense/article-ad-settings", () => ({
  getOrCreateArticleAdSettings: vi.fn().mockResolvedValue({ middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 10, anchorAdsEnabled: false, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: true }),
}));

describe("HomePage", () => {
  it("renders the homepage dynamically so transient errors are not cached", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("does not show topic shortcuts on the homepage", async () => {
    listPublishedPosts.mockResolvedValueOnce([{
      id: "post", slug: "guide", title: "Guide", excerpt: "Intro", publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }]);
    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.queryByRole("heading", { name: "先選一個你想解決的主題" })).not.toBeInTheDocument();
  });

  it("presents the latest answers as a readable list and uses the revised hero copy", async () => {
    listPublishedPosts.mockResolvedValueOnce([
      {
        id: "post-1", slug: "guide-1", title: "第一篇教學", excerpt: "快速解決問題", publishedAt: new Date("2026-09-03T00:00:00Z"),
        category: { name: "AI", slug: "ai", parent: null },
      },
      {
        id: "post-2", slug: "guide-2", title: "第二篇教學", excerpt: "另一個解法", publishedAt: new Date("2026-09-02T00:00:00Z"),
        category: { name: "軟體", slug: "software", parent: null },
      },
    ]);
    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.getByRole("heading", { name: "把複雜的科技問題變簡單。" })).toBeInTheDocument();
    expect(screen.getByText("1Wiki 提供 AI、App、軟體、手機與 3C 教學，從設定、操作到疑難排解，幫你更快解決每天遇到的科技問題。")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "剛整理好的實用教學" })).not.toBeInTheDocument();
    expect(screen.queryByText("最新解答")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "先選一個你想解決的主題" })).not.toBeInTheDocument();
    expect(screen.getByTestId("latest-answers")).toHaveClass("category-article-list");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
