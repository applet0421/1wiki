import { describe, expect, it } from "vitest";
import { getAdSlotConfig } from "./config";

const complete = {
  NODE_ENV: "production", NEXT_PUBLIC_ADSENSE_ENABLED: "true", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-1234567890",
  NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO: "101", NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: "102",
  NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END: "103", NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP: "104", NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE: "105",
};

describe("AdSense configuration", () => {
  it("requires enabled, client, slot and a published article route", () => {
    expect(getAdSlotConfig("article_mid", complete, { pathname: "/articles/guide", published: true })).toMatchObject({ mode: "live", clientId: "ca-pub-1234567890", slotId: "102" });
    expect(getAdSlotConfig("article_mid", { ...complete, NEXT_PUBLIC_ADSENSE_ENABLED: "false" }, { pathname: "/articles/guide", published: true })).toBeNull();
    expect(getAdSlotConfig("article_mid", { ...complete, NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: "" }, { pathname: "/articles/guide", published: true })).toBeNull();
    expect(getAdSlotConfig("article_mid", complete, { pathname: "/articles/draft", published: false })).toBeNull();
  });

  it("excludes non-article routes and keeps feed inline disabled in MVP", () => {
    for (const pathname of ["/admin", "/login", "/about", "/contact", "/privacy", "/terms", "/missing"]) {
      expect(getAdSlotConfig("article_end", complete, { pathname, published: true })).toBeNull();
    }
    expect(getAdSlotConfig("feed_inline", complete, { pathname: "/", published: true })).toBeNull();
  });

  it("shows a non-ad preview only during development", () => {
    expect(getAdSlotConfig("article_mid", { NODE_ENV: "development", NEXT_PUBLIC_ADSENSE_ENABLED: "false" }, { pathname: "/articles/guide", published: true }))
      .toEqual({ mode: "preview", placement: "article_mid", shape: "rectangle" });
  });
});
