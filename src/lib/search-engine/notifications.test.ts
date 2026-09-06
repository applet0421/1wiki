import { describe, expect, it } from "vitest";
import { buildGoogleSitemapEndpoint, buildIndexNowPayload, classifySearchEvent } from "./notifications";

describe("search engine notifications", () => {
  it("classifies public article changes", () => {
    expect(classifySearchEvent("DRAFT", "PUBLISHED")).toBe("publish");
    expect(classifySearchEvent("PUBLISHED", "PUBLISHED")).toBe("update");
    expect(classifySearchEvent("PUBLISHED", "DRAFT")).toBe("unpublish");
    expect(classifySearchEvent("DRAFT", "DRAFT")).toBeNull();
  });

  it("builds an IndexNow batch payload", () => {
    expect(buildIndexNowPayload("example.com", "key", ["https://example.com/a"])).toEqual({ host: "example.com", key: "key", urlList: ["https://example.com/a"] });
  });

  it("builds an encoded Google sitemap endpoint", () => {
    expect(buildGoogleSitemapEndpoint("sc-domain:example.com", "https://example.com/sitemap.xml")).toBe("https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aexample.com/sitemaps/https%3A%2F%2Fexample.com%2Fsitemap.xml");
  });
});
