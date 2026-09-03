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
    const metadata = buildPostMetadata(post);
    expect(metadata.title).toBe(post.title);
    expect(metadata.description).toBe(post.excerpt);
    expect(metadata.alternates?.canonical).toBe("https://1wiki.example/articles/chatgpt-login");
  });

  it("honors explicit SEO and canonical fields", () => {
    const metadata = buildPostMetadata({ ...post, seoTitle: "SEO 標題", seoDescription: "SEO 說明", canonicalUrl: "https://canonical.example/post" });
    expect(metadata).toMatchObject({ title: "SEO 標題", description: "SEO 說明", alternates: { canonical: "https://canonical.example/post" } });
  });
});
