import { afterEach, describe, expect, it } from "vitest";
import { buildPostMetadata } from "./metadata";

const post = {
  title: "ChatGPT 無法登入",
  slug: "chatgpt-login",
  excerpt: "逐步排除登入問題。",
  coverImage: null,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: "ChatGPT,登入",
  canonicalUrl: null,
};

describe("buildPostMetadata", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_URL = original; });

  it("uses SEO fallbacks and the canonical article URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://1wiki.example/";
    const metadata = buildPostMetadata(post, "zh-tw");
    expect(metadata.title).toBe(post.title);
    expect(metadata.description).toBe(post.excerpt);
    expect(metadata.alternates?.canonical).toBe("https://1wiki.example/zh-tw/articles/chatgpt-login");
    expect(metadata.openGraph).toMatchObject({ locale: "zh_TW" });
  });

  it("honors explicit SEO and canonical fields", () => {
    const metadata = buildPostMetadata({ ...post, seoTitle: "SEO 標題", seoDescription: "SEO 說明", canonicalUrl: "https://canonical.example/post" }, "zh-tw");
    expect(metadata).toMatchObject({ title: "SEO 標題", description: "SEO 說明", alternates: { canonical: "https://canonical.example/post" } });
  });

  it("does not expose internal AI review metadata", () => {
    const generatedPost = { ...post, aiContentType: "HOW_TO", searchIntent: "完成設定", aiNeedsVerification: ["待查證"] };
    const metadata = buildPostMetadata(generatedPost, "zh-tw");
    expect(JSON.stringify(metadata)).not.toContain("完成設定");
    expect(JSON.stringify(metadata)).not.toContain("待查證");
  });

  it("uses the requested locale in canonical and Open Graph metadata", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://1wiki.example";
    const metadata = buildPostMetadata(post, "ja");
    expect(metadata.alternates?.canonical).toBe("https://1wiki.example/ja/articles/chatgpt-login");
    expect(metadata.openGraph).toMatchObject({ locale: "ja_JP" });
    expect(metadata.alternates).not.toHaveProperty("languages");
  });
});
