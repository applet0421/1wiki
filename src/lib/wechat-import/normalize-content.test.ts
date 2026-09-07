import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeWeChatContent } from "./normalize-content";
import { parseWeChatHtml } from "./parse-wechat-html";

const standardHtml = readFileSync(join(process.cwd(), "src/lib/wechat-import/fixtures/standard-article.html"), "utf8");

describe("WeChat content normalization", () => {
  it("prefers data-src, strips source scripts, and preserves text-image-text order", () => {
    const parsed = parseWeChatHtml(standardHtml, new URL("https://mp.weixin.qq.com/s/example"));
    const normalized = normalizeWeChatContent(parsed);
    expect(normalized.imageRequests.map((item) => item.url)).toEqual(["https://mmbiz.qpic.cn/article-image?wx_fmt=jpeg"]);
    expect(normalized.sanitizedHtml).not.toMatch(/script|onclick|visibility:\s*hidden/i);
    expect(normalized.blocks.map((block) => block.type)).toEqual(["text", "image", "text"]);
  });
});
