import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const { listPublishedPosts, listPublishedRootCategories } = vi.hoisted(() => ({
  listPublishedPosts: vi.fn(),
  listPublishedRootCategories: vi.fn(),
}));

vi.mock("@/lib/content/repository", () => ({ listPublishedPosts, listPublishedRootCategories }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/adsense/article-ad-settings", () => ({
  getOrCreateArticleAdSettings: vi.fn().mockResolvedValue({ middleAdInterval: 2, maxMiddleAds: 3, anchorAdsEnabled: false, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: true }),
}));

describe("HomePage", () => {
  it("shows only root category cards with canonical category URLs", async () => {
    listPublishedPosts.mockResolvedValueOnce([{
      id: "post", slug: "guide", title: "Guide", excerpt: "Intro", publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }]);
    listPublishedRootCategories.mockResolvedValueOnce([{
      id: "root", name: "AI", slug: "ai", description: "AI guides", publishedPostCount: 1,
    }]);

    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.getByRole("link", { name: /AI/ })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.queryByRole("heading", { name: "ChatGPT" })).not.toBeInTheDocument();
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
    listPublishedRootCategories.mockResolvedValueOnce([]);

    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.getByRole("heading", { name: "把複雜的科技問題，變成做得到的步驟。" })).toBeInTheDocument();
    expect(screen.getByText("1Wiki 提供 AI、LINE、軟體與 3C 疑難解答，以清楚步驟協助你完成設定、排除錯誤並安全使用常見科技服務。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "繼續找你需要的解法" })).toBeInTheDocument();
    expect(screen.getByTestId("latest-answers")).toHaveClass("article-list");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("prioritizes the newest guide before the remaining latest guides and topic shortcuts", async () => {
    listPublishedPosts.mockResolvedValueOnce([
      {
        id: "post-1", slug: "first-guide", title: "第一篇教學", excerpt: "第一篇摘要", publishedAt: new Date("2026-09-03T00:00:00Z"),
        category: { name: "AI", slug: "ai", parent: null },
      },
      {
        id: "post-2", slug: "second-guide", title: "第二篇教學", excerpt: "第二篇摘要", publishedAt: new Date("2026-09-02T00:00:00Z"),
        category: { name: "軟體", slug: "software", parent: null },
      },
      {
        id: "post-3", slug: "third-guide", title: "第三篇教學", excerpt: "第三篇摘要", publishedAt: new Date("2026-09-01T00:00:00Z"),
        category: { name: "社群", slug: "social", parent: null },
      },
    ]);
    listPublishedRootCategories.mockResolvedValueOnce([
      { id: "root", name: "AI", slug: "ai", description: "AI guides", publishedPostCount: 3 },
    ]);

    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    const featured = screen.getByTestId("home-featured-guide");
    const latest = screen.getByTestId("latest-answers");
    const topics = screen.getByTestId("home-topic-shortcuts");

    expect(within(featured).getByRole("heading", { name: "第一篇教學" })).toBeInTheDocument();
    expect(within(latest).getByRole("heading", { name: "第二篇教學" })).toBeInTheDocument();
    expect(within(latest).getByRole("heading", { name: "第三篇教學" })).toBeInTheDocument();
    expect(featured.compareDocumentPosition(latest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(latest.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
