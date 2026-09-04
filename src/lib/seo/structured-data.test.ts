import { describe, expect, it } from "vitest";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildWebsiteJsonLd } from "./structured-data";

describe("structured data", () => {
  it("builds an Article object with author and publication dates", () => {
    const value = buildArticleJsonLd({
      title: "AI 教學", slug: "ai-guide", excerpt: "摘要", coverImage: null,
      publishedAt: new Date("2026-09-01T00:00:00.000Z"), updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      author: { displayName: "站長" },
    }, "https://1wiki.example", "en");
    expect(value).toMatchObject({ "@type": "Article", headline: "AI 教學", url: "https://1wiki.example/en/articles/ai-guide", inLanguage: "en", datePublished: "2026-09-01T00:00:00.000Z", dateModified: "2026-09-02T00:00:00.000Z", author: { "@type": "Person", name: "站長" } });
  });

  it("builds the approved Website identity", () => {
    expect(buildWebsiteJsonLd("https://1wiki.example", "ja")).toMatchObject({ "@type": "WebSite", inLanguage: "ja", url: "https://1wiki.example/ja" });
  });

  it("does not expose internal AI review metadata", () => {
    const post = {
      title: "AI 教學", slug: "ai-guide", excerpt: "摘要", coverImage: null,
      publishedAt: new Date("2026-09-01T00:00:00.000Z"), updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      author: { displayName: "站長" }, searchIntent: "內部搜尋意圖", aiNeedsVerification: ["內部警告"],
    };
    const value = buildArticleJsonLd(post, "https://1wiki.example", "zh-tw");
    expect(JSON.stringify(value)).not.toContain("內部搜尋意圖");
    expect(JSON.stringify(value)).not.toContain("內部警告");
  });

  it("builds ordered breadcrumb structured data with absolute URLs", () => {
    expect(buildBreadcrumbJsonLd([
      { name: "首頁", href: "/zh-tw" },
      { name: "AI", href: "/zh-tw/category/ai" },
      { name: "ChatGPT", href: "/zh-tw/category/ai/chatgpt" },
    ], "https://1wiki.example")).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "首頁", item: "https://1wiki.example/zh-tw" },
        { position: 2, name: "AI", item: "https://1wiki.example/zh-tw/category/ai" },
        { position: 3, name: "ChatGPT", item: "https://1wiki.example/zh-tw/category/ai/chatgpt" },
      ],
    });
  });
});
