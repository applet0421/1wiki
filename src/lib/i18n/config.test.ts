import { describe, expect, it } from "vitest";
import { defaultLocale, getLocaleConfig, isLocale, supportedLocales } from "./config";

describe("locale config", () => {
  it("exposes zh-tw as default and keeps the supported order", () => {
    expect(defaultLocale).toBe("zh-tw");
    expect(supportedLocales).toEqual(["zh-tw", "en", "ja"]);
  });

  it("rejects unknown and differently cased route segments", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("fr")).toBe(false);
  });

  it("maps route locales to platform locale values", () => {
    expect(getLocaleConfig("zh-tw")).toMatchObject({ htmlLang: "zh-Hant-TW", openGraphLocale: "zh_TW", dateLocale: "zh-TW" });
    expect(getLocaleConfig("en")).toMatchObject({ htmlLang: "en", openGraphLocale: "en_US", dateLocale: "en" });
    expect(getLocaleConfig("ja")).toMatchObject({ htmlLang: "ja", openGraphLocale: "ja_JP", dateLocale: "ja-JP" });
  });

  it("tracks which localized information pages are publishable", () => {
    expect(getLocaleConfig("zh-tw").publishedInfoPages).toEqual(["about", "contact", "privacy", "terms"]);
    expect(getLocaleConfig("en").publishedInfoPages).toEqual([]);
    expect(getLocaleConfig("ja").publishedInfoPages).toEqual([]);
  });
});
