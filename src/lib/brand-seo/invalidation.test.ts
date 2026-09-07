import { describe, expect, it } from "vitest";
import { brandSeoInvalidationPaths } from "./invalidation";

describe("brandSeoInvalidationPaths", () => {
  it("covers every public output and the OWNER settings page", () => {
    expect(brandSeoInvalidationPaths()).toEqual([
      "/zh-tw", "/en", "/ja", "/manifest.webmanifest", "/brand/icon-48.png", "/brand/logo", "/brand/og-default", "/sitemap.xml", "/admin/brand-seo",
    ]);
  });
});
