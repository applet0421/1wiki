import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl, siteConfig } from "./site";

describe("site configuration", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("normalizes the configured site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://1wiki.example/";
    expect(getSiteUrl()).toBe("https://1wiki.example");
  });

  it("keeps only the language-neutral site identity", () => {
    expect(siteConfig).toEqual({ shortName: "1Wiki" });
  });
});
