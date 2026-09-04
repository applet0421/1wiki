import { describe, expect, it, vi } from "vitest";
import { rewriteArticle } from "./rewrite-article";

describe("rewriteArticle", () => {
  it("sanitizes source HTML before prompting and sanitizes generated HTML", async () => {
    const execute = vi.fn(async (input: { variables: Record<string, string> }) => {
      expect(input.variables.sourceContentHtml).toContain("<p>原文內容</p>");
      expect(input.variables.sourceContentHtml).not.toContain('alert("bad")');
      return {
        title: "台灣 AI 工具完整指南",
        slug: "taiwan-ai-tools-guide",
        contentHtml: '<h2 onclick="bad()">重點</h2><script>bad()</script><p>改寫內容</p>',
        excerpt: "快速掌握 AI 工具特色。",
        seoTitle: "台灣 AI 工具完整指南",
        seoDescription: "認識 AI 工具功能、應用方式與選擇重點。",
        seoKeywords: "AI 工具, 人工智慧, 台灣",
      };
    });

    const result = await rewriteArticle({
      locale: "zh-tw",
      sourceTitle: "原始標題",
      sourceContentHtml: '<p>原文內容</p><script>alert("bad")</script>',
    }, {
      execute,
    });

    expect(result.contentHtml).toBe("<h2>重點</h2><p>改寫內容</p>");
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "ARTICLE_REWRITE" }), expect.anything());
  });

  it("rejects source articles without a title or meaningful content", async () => {
    await expect(rewriteArticle({ locale: "zh-tw", sourceTitle: " ", sourceContentHtml: "<p><br></p>" }))
      .rejects.toThrow("請填寫原文章標題與內容");
  });
});
