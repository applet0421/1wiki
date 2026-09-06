import { describe, expect, it } from "vitest";
import { publicCacheHeaders } from "./public-cache";

describe("public cache headers", () => {
  it("returns shared short-lived cache headers", () => {
    expect(publicCacheHeaders(60)).toEqual({
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  });
});
