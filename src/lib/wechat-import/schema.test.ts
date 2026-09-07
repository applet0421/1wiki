import { describe, expect, it } from "vitest";
import { parseRewriteDraft, parseStoredBlocks } from "./schema";

const blocks = [
  { id: "b-0001", type: "text", html: "<p>內文</p>" },
  { id: "b-0002", type: "image", assetId: "asset-1", alt: "示意圖" },
] as const;

describe("WeChat import schemas", () => {
  it("accepts canonical blocks and a complete editor-compatible rewrite", () => {
    expect(parseStoredBlocks(blocks)).toEqual(blocks);
    expect(parseRewriteDraft({ title: "標題", slug: "wechat-guide", excerpt: "摘要", blocks, seoTitle: "SEO 標題", seoDescription: "SEO 描述", seoKeywords: "微信,教學", needsVerification: [] }).blocks).toEqual(blocks);
  });

  it("rejects unknown block types and invalid slugs", () => {
    expect(() => parseStoredBlocks([{ id: "b-1", type: "video", src: "x" }])).toThrow();
    expect(() => parseRewriteDraft({ title: "標題", slug: "中文 slug", excerpt: "摘要", blocks, seoTitle: "SEO", seoDescription: "描述", seoKeywords: "關鍵字", needsVerification: [] })).toThrow();
  });
});
