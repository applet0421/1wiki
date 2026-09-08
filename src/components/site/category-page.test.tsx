import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { CategoryPageContent } from "./category-page";

const { getOrCreateArticleAdSettings } = vi.hoisted(() => ({ getOrCreateArticleAdSettings: vi.fn() }));
vi.mock("@/lib/adsense/article-ad-settings", () => ({ getOrCreateArticleAdSettings }));

describe("CategoryPageContent", () => {
  beforeEach(() => {
    getOrCreateArticleAdSettings.mockResolvedValue({ middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 10, anchorAdsEnabled: false, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: true });
  });

  it("renders breadcrumbs and descendant articles without the child-category section", async () => {
    render(await CategoryPageContent({ locale: "zh-tw", dictionary: getDictionary("zh-tw"), data: {
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" },
      ancestors: [],
      children: [{ id: "child", name: "ChatGPT", slug: "chatgpt", description: "對話式 AI", aggregatePostCount: 1 }],
      posts: [{
        id: "post", slug: "leaf-article", title: "Leaf article", excerpt: "摘要",
        publishedAt: new Date("2026-09-03T00:00:00Z"),
        category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
      }],
      sitePages: [],
    }}));

    expect(screen.queryByRole("region", { name: "子分類" })).not.toBeInTheDocument();
    expect(screen.getByText("Leaf article")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("AI"))
      .toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "文章列表" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveClass("category-article-item");
  });

  it("places category ads around a sufficiently long article list", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const posts = Array.from({ length: 11 }, (_, index) => ({
      id: `post-${index}`, slug: `article-${index}`, title: `Article ${index}`, excerpt: "摘要",
      publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }));
    render(await CategoryPageContent({ locale: "zh-tw", dictionary: getDictionary("zh-tw"), data: {
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" }, ancestors: [], children: [], posts, sitePages: [],
    }}));
    expect(screen.queryByTestId("ad-preview-category_after_intro")).not.toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_inline")).toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_end")).toBeInTheDocument();
    expect(screen.getByTestId("ad-preview-category_sidebar_desktop")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("uses the saved category Inline interval instead of a public environment value", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CATEGORY_INLINE_AD_INTERVAL", "20");
    getOrCreateArticleAdSettings.mockResolvedValue({ middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 4, anchorAdsEnabled: false, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: true });
    const posts = Array.from({ length: 5 }, (_, index) => ({
      id: `post-${index}`, slug: `article-${index}`, title: `Article ${index}`, excerpt: "摘要",
      publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }));

    render(await CategoryPageContent({ locale: "zh-tw", dictionary: getDictionary("zh-tw"), data: {
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" }, ancestors: [], children: [], posts, sitePages: [],
    }}));

    expect(screen.getAllByTestId("ad-preview-category_inline")).toHaveLength(1);
    expect(screen.getByText("Article 3").closest("li")?.nextElementSibling).toHaveClass("category-feed-ad");
    vi.unstubAllEnvs();
  });

  it("renders mounted site pages in a separate About block", async () => {
    render(await CategoryPageContent({ locale: "zh-tw", dictionary: getDictionary("zh-tw"), data: {
      category: { id: "root", name: "AI", slug: "ai", description: "AI 教學" }, ancestors: [], children: [], posts: [],
      sitePages: [{ id: "page", title: "關於 1Wiki", slug: "about", excerpt: "介紹" }],
    }}));

    const about = screen.getByRole("region", { name: "About" });
    expect(within(about).queryByText("網站資訊")).not.toBeInTheDocument();
    expect(within(about).queryByText("1 個頁面")).not.toBeInTheDocument();
    expect(within(about).getByRole("link", { name: /關於 1Wiki/ })).toHaveAttribute("href", "/zh-tw/about");
    expect(within(about).getByRole("list")).toHaveClass("category-site-pages-list");
    expect(within(about).getByRole("listitem")).toHaveClass("category-site-page-item");
  });
});
