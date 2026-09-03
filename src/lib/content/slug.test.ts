import { describe, expect, it } from "vitest";
import { slugifyTitle } from "./slug";

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
