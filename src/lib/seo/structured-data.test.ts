import { describe, expect, it } from "vitest";
import { buildArticleJsonLd, buildWebsiteJsonLd } from "./structured-data";

describe("structured data", () => {
  it("builds an Article object with author and publication dates", () => {
    const value = buildArticleJsonLd({
      title: "AI 教學", slug: "ai-guide", excerpt: "摘要", coverImage: null,
      publishedAt: new Date("2026-09-01T00:00:00.000Z"), updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      author: { displayName: "站長" },
    }, "https://1wiki.example");
    expect(value).toMatchObject({ "@type": "Article", headline: "AI 教學", datePublished: "2026-09-01T00:00:00.000Z", dateModified: "2026-09-02T00:00:00.000Z", author: { "@type": "Person", name: "站長" } });
  });

  it("builds the approved Website identity", () => {
    expect(buildWebsiteJsonLd("https://1wiki.example")).toMatchObject({ "@type": "WebSite", inLanguage: "zh-Hant-TW", url: "https://1wiki.example" });
  });
});
