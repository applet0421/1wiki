import { describe, expect, it } from "vitest";
import { decodeRouteSlug, slugifyTitle } from "./slug";

describe("slugifyTitle", () => {
  it("keeps useful Chinese and Latin text while removing punctuation", () => {
    expect(slugifyTitle("ChatGPT 無法登入？完整解法")).toBe(
      "chatgpt-無法登入-完整解法",
    );
  });

  it("collapses repeated separators", () => {
    expect(slugifyTitle("  Windows 11：更新 / 修復  ")).toBe(
      "windows-11-更新-修復",
    );
  });
});

describe("decodeRouteSlug", () => {
  it("decodes a percent-encoded Chinese article slug before a database lookup", () => {
    expect(decodeRouteSlug("line-%E6%94%B6%E4%B8%8D%E5%88%B0%E8%A8%8A%E6%81%AF")).toBe("line-收不到訊息");
  });
});
