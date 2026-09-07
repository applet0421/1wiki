import { describe, expect, it, vi } from "vitest";
import { assertImageInvariant, rewriteWeChatArticle } from "./rewrite";

const blocks = [
  { id: "b-0001", type: "text" as const, html: "<p>內文</p>" },
  { id: "b-0002", type: "image" as const, assetId: "asset-1", alt: "圖" },
];

describe("WeChat article rewrite", () => {
  it("keeps faithful blocks in their exact order", async () => {
    const execute = vi.fn(async () => ({ title: "改寫標題", slug: "rewritten-guide", excerpt: "摘要", blocks, seoTitle: "SEO 標題", seoDescription: "SEO 描述", seoKeywords: "微信,教學", needsVerification: [] }));
    await expect(rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: execute as never })).resolves.toMatchObject({ title: "改寫標題", blocks });
  });

  it("rejects reordered faithful content and duplicate deep-SEO images", () => {
    expect(() => assertImageInvariant("FAITHFUL", blocks, [blocks[1], blocks[0]])).toThrow(/圖片與段落順序/);
    expect(() => assertImageInvariant("DEEP_SEO", blocks, [blocks[0], blocks[1], blocks[1]])).toThrow(/圖片集合/);
  });
});
