import { describe, expect, it } from "vitest";
import { buildArticlePrompt } from "./prompt";

describe("buildArticlePrompt", () => {
  it("requires the complete article JSON structure without a Markdown code fence", () => {
    const prompt = buildArticlePrompt({ topic: "ChatGPT SEO", keyword: "GEO", instructions: "說明差異" });

    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"contentHtml"');
    expect(prompt).toContain('"slug"');
    expect(prompt).toContain('"excerpt"');
    expect(prompt).toContain('"seoTitle"');
    expect(prompt).toContain('"seoDescription"');
    expect(prompt).toContain('"seoKeywords"');
    expect(prompt).toContain("只輸出 JSON 物件");
  });
});
