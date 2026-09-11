import { describe, expect, it } from "vitest";
import { normalizeArticleImageAlts } from "./image-alt";

describe("normalizeArticleImageAlts", () => {
  it("uses the nearest preceding heading for images without alt text", () => {
    expect(normalizeArticleImageAlts(
      '<h2>通知設定</h2><p>依序檢查。</p><img src="https://example.com/notification.png"><h3>重新登入</h3><img src="https://example.com/login.png" alt="">',
      "LINE 通知問題",
    )).toContain('alt="通知設定 - 1Wiki"');
    expect(normalizeArticleImageAlts(
      '<h2>通知設定</h2><p>依序檢查。</p><img src="https://example.com/notification.png"><h3>重新登入</h3><img src="https://example.com/login.png" alt="">',
      "LINE 通知問題",
    )).toContain('alt="重新登入 - 1Wiki"');
  });

  it("normalizes existing alt text without adding the brand twice", () => {
    const result = normalizeArticleImageAlts('<img src="https://example.com/line.png" alt="LINE 設定畫面 - 1Wiki"><img src="https://example.com/app.png" alt="App 設定">', "文章標題");

    expect(result).toContain('alt="LINE 設定畫面 - 1Wiki"');
    expect(result).toContain('alt="App 設定 - 1Wiki"');
    expect(result).not.toContain("1Wiki - 1Wiki");
  });

  it("falls back to the article title when no preceding heading exists", () => {
    expect(normalizeArticleImageAlts('<p>導言</p><img src="https://example.com/cover.png">', "LINE 收不到訊息")).toContain('alt="LINE 收不到訊息 - 1Wiki"');
  });
});
