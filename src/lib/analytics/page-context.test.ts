import { describe, expect, it } from "vitest";
import { classifyPagePath } from "./page-context";

describe("classifyPagePath", () => {
  it("classifies article and category URLs into stable GA4 dimensions", () => {
    expect(classifyPagePath("/zh-tw/articles/ga4-guide")).toEqual({ locale: "zh-tw", pageType: "article", contentSlug: "ga4-guide", categorySlug: "", rootCategorySlug: "" });
    expect(classifyPagePath("/en/category/ai/chatgpt")).toEqual({ locale: "en", pageType: "category", contentSlug: "chatgpt", categorySlug: "chatgpt", rootCategorySlug: "ai" });
  });

  it("classifies author, home, static and unsupported paths", () => {
    expect(classifyPagePath("/ja/authors/editorial")).toMatchObject({ pageType: "author" });
    expect(classifyPagePath("/zh-tw")).toMatchObject({ pageType: "home" });
    expect(classifyPagePath("/zh-tw/about")).toMatchObject({ pageType: "static" });
    expect(classifyPagePath("/admin")).toBeNull();
  });
});
