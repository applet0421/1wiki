import { describe, expect, it, vi } from "vitest";
import { analyzeSource, generateFromIdea } from "./content-generator";

describe("AI content generator", () => {
  it("filters weak ideas and duplicate normalized search intents", async () => {
    const execute = vi.fn(async () => ({ ideas: [
        { type: "TROUBLESHOOTING", title: "LINE 沒通知", primaryKeyword: "LINE 沒通知", searchIntent: " 排除 LINE 通知問題 ", support: "STRONG" },
        { type: "HOW_TO", title: "設定 LINE 通知", primaryKeyword: "LINE 通知設定", searchIntent: "排除   LINE 通知問題", support: "MEDIUM" },
        { type: "HOW_TO", title: "資料不足", primaryKeyword: "LINE", searchIntent: "未知功能", support: "WEAK" },
      ] }));

    const result = await analyzeSource({ locale: "zh-tw", sourceContent: "這是一份 LINE 通知設定的參考資料。" }, { execute });

    expect(result.ideas).toEqual([{
      type: "TROUBLESHOOTING",
      title: "LINE 沒通知",
      primaryKeyword: "LINE 沒通知",
      searchIntent: "排除 LINE 通知問題",
      support: "STRONG",
    }]);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "SOURCE_ANALYZE" }), expect.anything());
  });

  it("rejects empty and oversized source content before calling a provider", async () => {
    const execute = vi.fn(async () => undefined);

    await expect(analyzeSource({ locale: "zh-tw", sourceContent: "  " }, { execute })).rejects.toThrow("請貼上參考內容");
    await expect(analyzeSource({ locale: "zh-tw", sourceContent: "字".repeat(50_001) }, { execute })).rejects.toThrow("50,000");
    expect(execute).not.toHaveBeenCalled();
  });

  it("generates a categorized article and sanitizes its HTML", async () => {
    const execute = vi.fn(async () => ({
        title: "LINE 收不到通知？常見原因與解決方法",
        slug: "line-notification-fix",
        contentHtml: '<h2>快速解決</h2><p onclick="bad()">先檢查通知。</p><script>bad()</script>',
        excerpt: "依序排除 LINE 通知問題。",
        seoTitle: "LINE 收不到通知解決方法",
        seoDescription: "整理 LINE 通知問題的排除步驟。",
        seoKeywords: "LINE,通知",
        categoryId: "category-ai",
        needsVerification: ["確認不同手機版本的選單名稱"],
      }));

    const result = await generateFromIdea({
      locale: "zh-tw",
      sourceContent: "LINE 通知設定說明",
      idea: { type: "TROUBLESHOOTING", title: "LINE 收不到通知", primaryKeyword: "LINE 收不到通知", searchIntent: "排除通知問題", support: "STRONG" },
      categories: [{ id: "category-ai", name: "AI" }],
    }, { execute });

    expect(result.categoryId).toBe("category-ai");
    expect(result.contentHtml).toBe("<h2>快速解決</h2><p>先檢查通知。</p>");
    expect(result.needsVerification).toEqual(["確認不同手機版本的選單名稱"]);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "IDEA_GENERATE" }), expect.anything());
  });

  it("rejects a category that was not offered to the model", async () => {
    const execute = vi.fn(async () => ({
        title: "教學", slug: "guide", contentHtml: "<p>內容</p>", excerpt: "摘要",
        seoTitle: "教學", seoDescription: "教學說明", seoKeywords: "教學",
        categoryId: "invented-category", needsVerification: [],
      }));

    await expect(generateFromIdea({
      locale: "zh-tw",
      sourceContent: "參考內容",
      idea: { type: "HOW_TO", title: "操作教學", primaryKeyword: "操作", searchIntent: "完成操作", support: "MEDIUM" },
      categories: [{ id: "real-category", name: "軟體" }],
    }, { execute })).rejects.toThrow("AI 回傳的分類不存在");
  });
});
