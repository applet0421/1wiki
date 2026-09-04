import { describe, expect, it, vi } from "vitest";
import { AIProviderError } from "./errors";
import { generateArticle } from "./generate-article";

describe("generateArticle", () => {
  it("normalizes and sanitizes the selected provider output without writing data", async () => {
    const execute = vi.fn(async (input: { parse: (value: unknown) => unknown }) => input.parse({
      title: "  安全教學  ", contentHtml: '<p onclick="bad()">內容</p><script>bad()</script>', excerpt: " 摘要 ",
      slug: " ai-login-guide ", seoTitle: " SEO ", seoDescription: " 說明 ", seoKeywords: " AI, 教學 ",
    }));

    const result = await generateArticle(
      { locale: "zh-tw", topic: "AI 登入", keyword: "ChatGPT 登入", instructions: "提供步驟" },
      { execute },
    );

    expect(result).toEqual({
      title: "安全教學", slug: "ai-login-guide", contentHtml: "<p>內容</p>", excerpt: "摘要",
      seoTitle: "SEO", seoDescription: "說明", seoKeywords: "AI, 教學",
    });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "ARTICLE_GENERATE" }), expect.anything());
  });

  it("rejects malformed provider JSON as invalid output", async () => {
    const execute = vi.fn(async () => { throw new AIProviderError("invalid_output"); });
    await expect(generateArticle(
      { locale: "zh-tw", topic: "主題", keyword: "關鍵字", instructions: "" },
      { execute },
    )).rejects.toMatchObject({ category: "invalid_output" });
  });
});
