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

  it("uses the approved Traditional Chinese identity", () => {
    expect(siteConfig.name).toBe("1Wiki｜AI、軟體、3C 使用教學與疑難解答");
    expect(siteConfig.locale).toBe("zh-Hant-TW");
  });
});
