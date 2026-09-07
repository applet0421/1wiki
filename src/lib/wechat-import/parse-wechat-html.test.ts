import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWeChatHtml, WeChatParseError } from "./parse-wechat-html";

const standardHtml = readFileSync(join(process.cwd(), "src/lib/wechat-import/fixtures/standard-article.html"), "utf8");
const verificationHtml = readFileSync(join(process.cwd(), "src/lib/wechat-import/fixtures/verification-page.html"), "utf8");

describe("WeChat HTML parser", () => {
  it("extracts the public article metadata", () => {
    expect(parseWeChatHtml(standardHtml, new URL("https://mp.weixin.qq.com/s/example"))).toMatchObject({
      title: "範例標題", accountName: "範例公眾號", author: "範例作者",
    });
  });

  it("returns a stable access error for verification pages", () => {
    expect(() => parseWeChatHtml(verificationHtml, new URL("https://mp.weixin.qq.com/s/example"))).toThrow(WeChatParseError);
    try { parseWeChatHtml(verificationHtml, new URL("https://mp.weixin.qq.com/s/example")); } catch (error) {
      expect(error).toMatchObject({ code: "SOURCE_VERIFICATION_REQUIRED" });
    }
  });
});
