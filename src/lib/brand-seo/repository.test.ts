import { describe, expect, it } from "vitest";
import { resolveBrandSeo } from "./repository";

const emptyClient = {
  brandSeoSettings: { findUnique: async () => null },
  localeSeoSettings: { findMany: async () => [] },
};

describe("resolveBrandSeo", () => {
  it("returns public-safe defaults when no settings have been saved", async () => {
    await expect(resolveBrandSeo(emptyClient)).resolves.toMatchObject({
      siteName: "1Wiki",
      alternateNames: ["1wiki.org"],
      assets: { favicon: "/favicon.ico", icon48: "/brand/icon-48.png", logo: "/brand/logo", defaultOg: "/brand/og-default" },
      locales: {
        "zh-tw": { homeTitle: "1Wiki｜AI、軟體、3C 使用教學與疑難解答" },
        en: { homeDescription: "Clear, practical guides for AI, software, social platforms, and everyday technology." },
        ja: { homeTitle: "1Wiki｜実用的なテクノロジーガイド" },
      },
    });
  });

  it("uses saved values only for the matching supported locale", async () => {
    const client = {
      brandSeoSettings: { findUnique: async () => ({ siteName: "1Wiki Help", alternateName: "Help Center", icon48SourceUrl: "https://media.example/uploads/brand/icon.png", logoSourceUrl: null, defaultOgSourceUrl: null }) },
      localeSeoSettings: { findMany: async () => [
        { locale: "en", homeTitle: "1Wiki Help", homeDescription: "English support", ogTitle: "1Wiki Help", ogDescription: "English support" },
        { locale: "fr", homeTitle: "Ignore", homeDescription: "Ignore", ogTitle: "Ignore", ogDescription: "Ignore" },
      ] },
    };

    const result = await resolveBrandSeo(client);

    expect(result.siteName).toBe("1Wiki Help");
    expect(result.alternateNames).toEqual(["Help Center"]);
    expect(result.locales.en).toEqual({ homeTitle: "1Wiki Help", homeDescription: "English support", ogTitle: "1Wiki Help", ogDescription: "English support" });
    expect(result.locales.ja.homeTitle).toBe("1Wiki｜実用的なテクノロジーガイド");
  });
});
