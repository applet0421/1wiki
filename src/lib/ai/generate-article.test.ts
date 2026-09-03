import { describe, expect, it, vi } from "vitest";
import { generateArticle } from "./generate-article";

describe("generateArticle", () => {
  it("normalizes and sanitizes the selected provider output without writing data", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
      title: "  安全教學  ", contentHtml: '<p onclick="bad()">內容</p><script>bad()</script>', excerpt: " 摘要 ",
      seoTitle: " SEO ", seoDescription: " 說明 ", seoKeywords: " AI, 教學 ",
    }) } }] }), { status: 200 }));

    const result = await generateArticle(
      { topic: "AI 登入", keyword: "ChatGPT 登入", instructions: "提供步驟" },
      { env: { DEEPSEEK_API_KEY: "key", DEEPSEEK_MODEL: "model" }, fetcher },
    );

    expect(result).toEqual({
      title: "安全教學", contentHtml: "<p>內容</p>", excerpt: "摘要",
      seoTitle: "SEO", seoDescription: "說明", seoKeywords: "AI, 教學",
    });
  });

  it("rejects malformed provider JSON as invalid output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }));
    await expect(generateArticle(
      { topic: "主題", keyword: "關鍵字", instructions: "" },
      { env: { DEEPSEEK_API_KEY: "key", DEEPSEEK_MODEL: "model" }, fetcher },
    )).rejects.toMatchObject({ category: "invalid_output" });
  });
});
