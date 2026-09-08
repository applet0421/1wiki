import { describe, expect, it } from "vitest";
import { getAdSlotConfig, getAnchorAdsConfig, getLiveAdsenseClientId } from "./config";

const complete = {
  NODE_ENV: "production", NEXT_PUBLIC_ADSENSE_ENABLED: "true", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890",
  NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO: "101", NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: "102",
  NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END: "103", NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP_STICKY: "104", NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE: "105",
  NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_AFTER_INTRO: "201", NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_INLINE: "202",
  NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_END: "203", NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_SIDEBAR_DESKTOP: "204",
};

describe("AdSense configuration", () => {
  it("uses one sticky article sidebar slot and disables it when missing in production", () => {
    const context = { pathname: "/zh-tw/articles/guide", published: true };
    expect(getAdSlotConfig("sidebar_desktop_sticky", complete, context)).toMatchObject({ mode: "live", slotId: "104", shape: "rectangle" });
    expect(getAdSlotConfig("sidebar_desktop_sticky", { ...complete, NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP_STICKY: "" }, context)).toBeNull();
  });
  it("requires enabled, client, slot and a published article route", () => {
    expect(getAdSlotConfig("article_mid", complete, { pathname: "/zh-tw/articles/guide", published: true })).toMatchObject({ mode: "live", clientId: "ca-pub-1234567890", slotId: "102" });
    expect(getAdSlotConfig("article_mid", { ...complete, NEXT_PUBLIC_ADSENSE_ENABLED: "false" }, { pathname: "/zh-tw/articles/guide", published: true })).toBeNull();
    expect(getAdSlotConfig("article_mid", { ...complete, NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: "" }, { pathname: "/zh-tw/articles/guide", published: true })).toBeNull();
    expect(getAdSlotConfig("article_mid", complete, { pathname: "/zh-tw/articles/draft", published: false })).toBeNull();
    expect(getAdSlotConfig("article_mid", complete, { pathname: "/fr/articles/guide", published: true })).toBeNull();
  });

  it("excludes non-article routes and keeps feed inline disabled in MVP", () => {
    for (const pathname of ["/admin", "/login", "/about", "/contact", "/privacy", "/terms", "/missing"]) {
      expect(getAdSlotConfig("article_end", complete, { pathname, published: true })).toBeNull();
    }
    expect(getAdSlotConfig("feed_inline", complete, { pathname: "/", published: true })).toBeNull();
  });

  it("shows a non-ad preview only during development", () => {
    expect(getAdSlotConfig("article_mid", { NODE_ENV: "development", NEXT_PUBLIC_ADSENSE_ENABLED: "false" }, { pathname: "/en/articles/guide", published: true }))
      .toEqual({ mode: "preview", placement: "article_mid", shape: "rectangle" });
  });

  it("supports controlled category page placements and keeps them off article pages", () => {
    const context = { pathname: "/zh-tw/category/software", published: true };
    expect(getAdSlotConfig("category_after_intro", complete, context)).toMatchObject({ mode: "live", slotId: "201", shape: "banner" });
    expect(getAdSlotConfig("category_inline", complete, context)).toMatchObject({ mode: "live", slotId: "202", shape: "rectangle" });
    expect(getAdSlotConfig("category_end", complete, context)).toMatchObject({ mode: "live", slotId: "203", shape: "banner" });
    expect(getAdSlotConfig("category_sidebar_desktop", complete, context)).toMatchObject({ mode: "live", slotId: "204", shape: "rectangle" });
    expect(getAdSlotConfig("category_inline", complete, { pathname: "/zh-tw/articles/guide", published: true })).toBeNull();
    expect(getAdSlotConfig("category_inline", complete, { pathname: "/zh-tw/category/software", published: false })).toBeNull();
    expect(getLiveAdsenseClientId(complete, "/zh-tw/category/software")).toBe("ca-pub-1234567890");
  });

  it("enables bottom Anchor ads only for the owner-selected public page types", () => {
    const settings = {
      anchorAdsEnabled: true,
      anchorAdsOnArticles: true,
      anchorAdsOnHome: false,
      anchorAdsOnCategories: true,
    };
    expect(getAnchorAdsConfig(settings, "article")).toEqual({ enabled: true });
    expect(getAnchorAdsConfig(settings, "home")).toEqual({ enabled: false });
    expect(getAnchorAdsConfig(settings, "category")).toEqual({ enabled: true });
    expect(getAnchorAdsConfig({ ...settings, anchorAdsEnabled: false }, "article")).toEqual({ enabled: false });
  });

  it("allows the AdSense loader on the locale home route for Google-managed Anchor ads", () => {
    expect(getLiveAdsenseClientId(complete, "/zh-tw")).toBe("ca-pub-1234567890");
    expect(getLiveAdsenseClientId(complete, "/zh-tw/about")).toBeNull();
  });
});
