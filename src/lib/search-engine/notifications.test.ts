import { describe, expect, it } from "vitest";
import { buildIndexNowPayload, classifySearchEvent } from "./notifications";

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
});
