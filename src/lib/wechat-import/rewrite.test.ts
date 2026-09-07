import { describe, expect, it, vi } from "vitest";
import { assertImageInvariant, rewriteWeChatArticle } from "./rewrite";
import { callDeepSeekStructuredWithUsage } from "@/lib/ai/providers/deepseek";

const blocks = [
  { id: "b-0001", type: "text" as const, html: "<p>內文</p>" },
  { id: "b-0002", type: "image" as const, assetId: "asset-1", alt: "圖" },
];

describe("WeChat article rewrite", () => {
  it("decodes the provider JSON string before validating the rewrite", async () => {
    const execute = async (request: Parameters<import("@/lib/ai/execute-llm").LLMExecutor>[0]) => {
      const result = await callDeepSeekStructuredWithUsage({
        ...request, apiKey: "test", model: "test", prompt: "test",
        fetcher: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ title: "改寫標題", slug: "rewritten-guide", excerpt: "摘要", blocks, seoTitle: "SEO 標題", seoDescription: "SEO 描述", seoKeywords: "微信,教學", needsVerification: [] }) } }] }), { status: 200 }),
      });
      return result.value;
    };
    await expect(rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: execute as never })).resolves.toMatchObject({ title: "改寫標題", blocks });
  });

  it("keeps faithful blocks in their exact order", async () => {
    const execute = vi.fn(async () => ({ title: "改寫標題", slug: "rewritten-guide", excerpt: "摘要", blocks, seoTitle: "SEO 標題", seoDescription: "SEO 描述", seoKeywords: "微信,教學", needsVerification: [] }));
    await expect(rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: execute as never })).resolves.toMatchObject({ title: "改寫標題", blocks });
  });

  it("provides typed block and SEO constraints to JSON-only providers", async () => {
    const execute = vi.fn(async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks, seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] }));
    await rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: execute as never });
    const request = execute.mock.calls[0] as unknown as [import("@/lib/ai/execute-llm").ExecuteLLMInput<unknown>];
    const schema = request[0].jsonSchema as { properties: { blocks: { items: { anyOf: unknown[] } } } };
    expect(schema.properties.blocks.items.anyOf).toEqual(expect.arrayContaining([
      expect.objectContaining({ required: ["id", "type", "html"], additionalProperties: false }),
      expect.objectContaining({ required: ["id", "type", "assetId", "alt"], additionalProperties: false }),
    ]));
    expect(request[0].variables.blockContract).toContain(JSON.stringify(schema));
  });

  it("rejects reordered faithful content and duplicate deep-SEO images", () => {
    expect(() => assertImageInvariant("FAITHFUL", blocks, [blocks[1], blocks[0]])).toThrow(/圖片與段落順序/);
    expect(() => assertImageInvariant("DEEP_SEO", blocks, [blocks[0], blocks[1], blocks[1]])).toThrow(/圖片集合/);
  });

  it("binds rewritten images to original assets instead of model-generated references", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [blocks[0], { ...blocks[1], assetId: "hallucinated-id" }], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    const draft = await rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "標題", sourceMetadata: {}, blocks }, { execute });
    expect(draft.blocks[1]).toMatchObject({ id: "b-0002", assetId: "asset-1" });
    expect(() => assertImageInvariant("FAITHFUL", blocks, [blocks[0], { id: "b-0002", type: "image", alt: "圖", assetId: "wrong" }])).toThrow();
  });
});
