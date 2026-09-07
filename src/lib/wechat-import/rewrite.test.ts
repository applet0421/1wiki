import { describe, expect, it, vi } from "vitest";
import { assertImageInvariant, rewriteWeChatArticle } from "./rewrite";
import { callDeepSeekStructuredWithUsage } from "@/lib/ai/providers/deepseek";
import type { ExecuteLLMInput } from "@/lib/ai/execute-llm";

const blocks = [
  { id: "b-0001", type: "text" as const, html: "<h2>內文標題</h2><p>內文</p>" },
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

  it("rejects a rewrite without an H2 section", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [{ id: "b-0001", type: "text" as const, html: "<p>沒有章節標題的正文</p>" }, blocks[1]], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    await expect(rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute })).rejects.toThrow(/H2/);
  });

  it("rejects a long deep SEO rewrite without H3 subsections", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [{ id: "b-0001", type: "text" as const, html: `<h2>主要章節</h2><p>${"內容".repeat(700)}</p>` }, blocks[1]], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    await expect(rewriteWeChatArticle({ mode: "DEEP_SEO", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute })).rejects.toThrow(/H3/);
  });

  it("rejects an H1 in rewritten content blocks", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [{ id: "b-0001", type: "text" as const, html: "<h1>重複標題</h1><h2>章節</h2><p>正文</p>" }, blocks[1]], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    await expect(rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute })).rejects.toThrow(/H1/);
  });

  it("keeps only article text HTML tags in rewritten text blocks", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [{ id: "b-0001", type: "text" as const, html: '<div><h2>章節</h2><p>正文</p><img src="https://example.test/image.png"><iframe src="https://example.test"></iframe></div>' }, blocks[1]], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    const draft = await rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute });
    expect(draft.blocks[0]).toMatchObject({ type: "text", html: "<h2>章節</h2><p>正文</p>" });
  });

  it("converts simplified Chinese model output to Traditional Chinese for zh-tw", async () => {
    const execute = async () => ({ title: "这一次，真不是狼来了", slug: "guide", excerpt: "这是摘要", blocks: [{ id: "b-0001", type: "text" as const, html: "<h2>这是段落</h2>" }, { id: "b-0002", type: "image" as const, assetId: "asset-1", alt: "这是图片" }], seoTitle: "这是 SEO 标题", seoDescription: "这是 SEO 描述", seoKeywords: "这是,测试", needsVerification: ["这是待核实事项"] });
    const draft = await rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute });
    expect(draft).toMatchObject({ title: "這一次，真不是狼來了", excerpt: "這是摘要", seoTitle: "這是 SEO 標題", seoDescription: "這是 SEO 描述", seoKeywords: "這是,測試", needsVerification: ["這是待核實事項"] });
    expect(draft.blocks).toEqual([{ id: "b-0001", type: "text", html: "<h2>這是段落</h2>" }, { id: "b-0002", type: "image", assetId: "asset-1", alt: "這是圖片" }]);
  });

  it("assigns a unique text block id when deep SEO output collides with an image id", async () => {
    const execute = async () => ({ title: "標題", slug: "guide", excerpt: "摘要", blocks: [{ id: "b-0002", type: "text" as const, html: "<h2>重組段落</h2>" }, blocks[1]], seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] });
    const draft = await rewriteWeChatArticle({ mode: "DEEP_SEO", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute });
    expect(draft.blocks.map((block) => block.id)).toEqual(["b-0003", "b-0002"]);
    expect(draft.blocks[1]).toMatchObject({ type: "image", assetId: "asset-1" });
  });

  it("uses separate prompt keys and heading contracts for each rewrite mode", async () => {
    const draft = { title: "標題", slug: "guide", excerpt: "摘要", blocks, seoTitle: "標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [] };
    const faithfulRequests: ExecuteLLMInput<unknown>[] = [];
    const seoRequests: ExecuteLLMInput<unknown>[] = [];
    const faithful = async (request: ExecuteLLMInput<unknown>) => { faithfulRequests.push(request); return draft; };
    const seo = async (request: ExecuteLLMInput<unknown>) => { seoRequests.push(request); return draft; };
    await rewriteWeChatArticle({ mode: "FAITHFUL", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: faithful as never });
    await rewriteWeChatArticle({ mode: "DEEP_SEO", locale: "zh-tw", sourceTitle: "原標題", sourceMetadata: {}, blocks }, { execute: seo as never });
    const [faithfulRequest] = faithfulRequests;
    const [seoRequest] = seoRequests;
    if (!faithfulRequest || !seoRequest) throw new Error("Expected one request per rewrite mode");
    expect(faithfulRequest.key).toBe("WECHAT_ARTICLE_REWRITE_FAITHFUL");
    expect(seoRequest.key).toBe("WECHAT_ARTICLE_REWRITE_DEEP_SEO");
    expect(faithfulRequest.variables.blockContract).toContain("不新增、刪除或重排區塊");
    expect(faithfulRequest.variables.blockContract).toContain("h2、h3");
    expect(seoRequest.variables.blockContract).toContain("以 h2 建立主要章節");
    expect(seoRequest.variables.blockContract).toContain("h3");
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
