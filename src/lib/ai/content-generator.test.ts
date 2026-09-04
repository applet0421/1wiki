import { describe, expect, it, vi } from "vitest";
import { analyzeSource, generateFromIdea } from "./content-generator";

const env = { DEEPSEEK_API_KEY: "key", DEEPSEEK_MODEL: "model" };

describe("AI content generator", () => {
  it("filters weak ideas and duplicate normalized search intents", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ ideas: [
        { type: "TROUBLESHOOTING", title: "LINE 沒通知", primaryKeyword: "LINE 沒通知", searchIntent: " 排除 LINE 通知問題 ", support: "STRONG" },
        { type: "HOW_TO", title: "設定 LINE 通知", primaryKeyword: "LINE 通知設定", searchIntent: "排除   LINE 通知問題", support: "MEDIUM" },
        { type: "HOW_TO", title: "資料不足", primaryKeyword: "LINE", searchIntent: "未知功能", support: "WEAK" },
      ] }) } }],
    }), { status: 200 }));

    const result = await analyzeSource({ sourceContent: "這是一份 LINE 通知設定的參考資料。" }, { env, fetcher });

    expect(result.ideas).toEqual([{
      type: "TROUBLESHOOTING",
      title: "LINE 沒通知",
      primaryKeyword: "LINE 沒通知",
      searchIntent: "排除 LINE 通知問題",
      support: "STRONG",
    }]);
  });

  it("rejects empty and oversized source content before calling a provider", async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(analyzeSource({ sourceContent: "  " }, { env, fetcher })).rejects.toThrow("請貼上參考內容");
    await expect(analyzeSource({ sourceContent: "字".repeat(50_001) }, { env, fetcher })).rejects.toThrow("50,000");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("generates a categorized article and sanitizes its HTML", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        title: "LINE 收不到通知？常見原因與解決方法",
        slug: "line-notification-fix",
        contentHtml: '<h2>快速解決</h2><p onclick="bad()">先檢查通知。</p><script>bad()</script>',
        excerpt: "依序排除 LINE 通知問題。",
        seoTitle: "LINE 收不到通知解決方法",
        seoDescription: "整理 LINE 通知問題的排除步驟。",
        seoKeywords: "LINE,通知",
        categoryId: "category-ai",
        needsVerification: ["確認不同手機版本的選單名稱"],
      }) } }],
    }), { status: 200 }));

    const result = await generateFromIdea({
      sourceContent: "LINE 通知設定說明",
      idea: { type: "TROUBLESHOOTING", title: "LINE 收不到通知", primaryKeyword: "LINE 收不到通知", searchIntent: "排除通知問題", support: "STRONG" },
      categories: [{ id: "category-ai", name: "AI" }],
    }, { env, fetcher });

    expect(result.categoryId).toBe("category-ai");
    expect(result.contentHtml).toBe("<h2>快速解決</h2><p>先檢查通知。</p>");
    expect(result.needsVerification).toEqual(["確認不同手機版本的選單名稱"]);
  });

  it("rejects a category that was not offered to the model", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        title: "教學", slug: "guide", contentHtml: "<p>內容</p>", excerpt: "摘要",
        seoTitle: "教學", seoDescription: "教學說明", seoKeywords: "教學",
        categoryId: "invented-category", needsVerification: [],
      }) } }],
    }), { status: 200 }));

    await expect(generateFromIdea({
      sourceContent: "參考內容",
      idea: { type: "HOW_TO", title: "操作教學", primaryKeyword: "操作", searchIntent: "完成操作", support: "MEDIUM" },
      categories: [{ id: "real-category", name: "軟體" }],
    }, { env, fetcher })).rejects.toThrow("AI 回傳的分類不存在");
  });
});
