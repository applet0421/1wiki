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
});
