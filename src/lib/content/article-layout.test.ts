import { describe, expect, it } from "vitest";
import { inspectArticleLayout } from "./article-layout";

describe("inspectArticleLayout", () => {
  it("reports missing descriptions, consecutive images, and skipped heading levels", () => {
    const codes = inspectArticleLayout('<h2>設定</h2><figure class="article-image"><img src="https://img.example/one.png" alt=""></figure><img src="https://img.example/two.png" alt="第二張"><h4>不允許</h4>')
      .map((item) => item.code);

    expect(codes).toEqual(["IMAGE_ALT_MISSING", "IMAGE_CAPTION_MISSING", "CONSECUTIVE_IMAGES", "HEADING_LEVEL_SKIP"]);
  });

  it("accepts a complete clear-tutorial section", () => {
    expect(inspectArticleLayout('<h2>同步</h2><ol class="article-steps"><li>開啟設定</li></ol><figure class="article-image"><img src="https://img.example/one.png" alt="同步按鈕"><figcaption>執行同步。</figcaption></figure><div class="article-callout article-callout-warning"><strong>注意</strong><p>保留空間。</p></div>')).toEqual([]);
  });

  it("reports a paragraph longer than 500 visible characters once", () => {
    expect(inspectArticleLayout(`<p>${"內容".repeat(251)}</p>`)).toEqual([
      { code: "LONG_PARAGRAPH", message: "段落過長，建議拆分為較短的可掃讀內容。" },
    ]);
  });
});
