import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("removes scripts and event handlers", () => {
    expect(
      sanitizeArticleHtml(
        '<p onclick="steal()">安全</p><script>alert(1)</script>',
      ),
    ).toBe("<p>安全</p>");
  });

  it("removes stored AdSense elements entirely", () => {
    expect(
      sanitizeArticleHtml('<p>前文</p><ins class="adsbygoogle">ad</ins>'),
    ).toBe("<p>前文</p>");
  });

  it("removes dangerous link and image URLs", () => {
    expect(
      sanitizeArticleHtml(
        '<a href="javascript:alert(1)">連結</a><img src="data:text/html,bad" alt="x">',
      ),
    ).toBe("<a>連結</a>");
  });

  it("secures links that open a new tab", () => {
    expect(
      sanitizeArticleHtml(
        '<a href="https://example.com" target="_blank">文件</a>',
      ),
    ).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">文件</a>',
    );
  });

  it("preserves line breaks produced by Enter in the rich text editor", () => {
    expect(sanitizeArticleHtml("<div>第一行</div><div>第二行</div>")).toBe(
      "<div>第一行</div><div>第二行</div>",
    );
  });

  it("preserves bold and italic formatting emitted by the rich text toolbar", () => {
    expect(sanitizeArticleHtml("<p><b>粗體</b><i>斜體</i></p>")).toBe(
      "<p><strong>粗體</strong><em>斜體</em></p>",
    );
  });

  it("preserves only the clear tutorial figure and layout classes", () => {
    expect(sanitizeArticleHtml('<figure class="article-image article-image-narrow extra"><img src="https://img.example/line.png" alt="同步按鈕"><figcaption class="article-caption">執行同步</figcaption></figure><div class="article-callout article-callout-warning" style="color:red"><strong>注意</strong><p>保留 2GB。</p></div>')).toBe(
      '<figure class="article-image article-image-narrow"><img src="https://img.example/line.png" alt="同步按鈕" /><figcaption>執行同步</figcaption></figure><div class="article-callout article-callout-warning"><strong>注意</strong><p>保留 2GB。</p></div>',
    );
  });

  it("removes unknown article classes while preserving image URL safety", () => {
    expect(sanitizeArticleHtml('<ol class="article-steps injected"><li>第一步</li></ol><img class="article-image" src="javascript:bad" alt="x">')).toBe(
      '<ol class="article-steps"><li>第一步</li></ol>',
    );
  });
});
