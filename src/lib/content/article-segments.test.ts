import { describe, expect, it } from "vitest";
import { segmentArticle } from "./article-segments";

describe("segmentArticle", () => {
  it("ends the introduction before the first H2", () => {
    const result = segmentArticle(
      "<p>導言第一段</p><p>導言第二段</p><h2>步驟</h2><p>內容</p>",
    );

    expect(result.introHtml).toBe("<p>導言第一段</p><p>導言第二段</p>");
    expect(result.bodySegments).toEqual([
      "<h2>步驟</h2><p>內容</p>",
    ]);
  });

  it("omits the middle-ad boundary below 1200 visible characters", () => {
    const html = `<p>${"導".repeat(399)}</p><h2>一</h2><p>${"甲".repeat(400)}</p><h2>二</h2><p>${"乙".repeat(398)}</p>`;

    expect(segmentArticle(html).visibleCharacterCount).toBe(1199);
    expect(segmentArticle(html).midAdAfterIndex).toBeNull();
  });

  it("chooses the completed H2 section nearest 45 percent", () => {
    const html = `<p>${"導".repeat(200)}</p><h2>一</h2><p>${"甲".repeat(600)}</p><h2>二</h2><p>${"乙".repeat(600)}</p><h2>三</h2><p>${"丙".repeat(600)}</p>`;
    const result = segmentArticle(html);

    expect(result.visibleCharacterCount).toBe(2003);
    expect(result.bodySegments).toHaveLength(3);
    expect(result.midAdAfterIndex).toBe(0);
  });
});
