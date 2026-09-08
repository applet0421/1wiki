import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticlePanel } from "./article-panel";

const mocks = vi.hoisted(() => ({
  adEnvironment: { NODE_ENV: "development" } as Record<string, string | undefined>,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { post: { findMany: vi.fn().mockResolvedValue([]) } },
}));

vi.mock("@/lib/brand-seo/repository", () => ({
  resolveBrandSeo: vi.fn().mockResolvedValue({
    siteName: "1Wiki",
    alternateNames: [],
    assets: { logo: "/logo.svg" },
  }),
}));

vi.mock("@/lib/adsense/article-ad-settings", () => ({
  getOrCreateArticleAdSettings: vi.fn().mockResolvedValue({ middleAdInterval: 2, maxMiddleAds: 3 }),
}));

vi.mock("@/lib/adsense/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/adsense/config")>();
  return {
    ...actual,
    getPublicAdEnvironment: () => mocks.adEnvironment,
  };
});

const post = {
  id: "post-1",
  slug: "article-one",
  title: "第一篇",
  excerpt: "文章摘要",
  contentHtml: `<p>${"導".repeat(200)}</p><h2>段落</h2><p>${"文".repeat(1300)}</p>`,
  categoryId: "category-1",
  category: { id: "category-1", name: "教學", slug: "tutorial", parent: null },
  author: { displayName: "作者" },
  byline: null,
  publishedAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
};

describe("ArticlePanel advertising", () => {
  afterEach(() => {
    mocks.adEnvironment = { NODE_ENV: "development" };
  });

  it.each([
    ["initial", true],
    ["continuation", false],
  ])("renders one sidebar ad for every %s article", async (_name, initial) => {
    render(await ArticlePanel({ post: post as never, locale: "zh-tw", initial }));

    expect(screen.getAllByLabelText("文章側欄廣告")).toHaveLength(1);
    expect(screen.getAllByTestId("ad-preview-sidebar_desktop_sticky")).toHaveLength(1);
    expect(screen.queryByTestId("ad-preview-sidebar_desktop")).not.toBeInTheDocument();
  });

  it("does not reserve an article sidebar when its production slot is unavailable", async () => {
    mocks.adEnvironment = { NODE_ENV: "production", NEXT_PUBLIC_ADSENSE_ENABLED: "false" };
    render(await ArticlePanel({ post: post as never, locale: "zh-tw", initial: true }));

    expect(screen.queryByLabelText("文章側欄廣告")).not.toBeInTheDocument();
    expect(screen.getByLabelText("第一篇")).not.toHaveClass("has-sidebar");
  });
});
