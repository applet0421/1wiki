import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ARTICLE_AD_SETTINGS, getOrCreateArticleAdSettings, hasArticleAdSettingsModel, validateArticleAdSettings } from "./article-ad-settings";

describe("article ad settings", () => {
  it("accepts configured values within the safe owner ranges", () => {
    expect(validateArticleAdSettings({ middleAdInterval: 6, maxMiddleAds: 5 })).toEqual({ middleAdInterval: 6, maxMiddleAds: 5 });
  });

  it("rejects an interval or cap outside the safe owner ranges", () => {
    expect(() => validateArticleAdSettings({ middleAdInterval: 0, maxMiddleAds: 3 })).toThrow(/middleAdInterval/);
    expect(() => validateArticleAdSettings({ middleAdInterval: 2, maxMiddleAds: 6 })).toThrow(/maxMiddleAds/);
  });

  it("creates and returns the default settings when no row exists yet", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "default", ...DEFAULT_ARTICLE_AD_SETTINGS });
    await expect(getOrCreateArticleAdSettings({ articleAdSetting: { upsert } } as never)).resolves.toEqual(DEFAULT_ARTICLE_AD_SETTINGS);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", ...DEFAULT_ARTICLE_AD_SETTINGS },
      update: {},
    });
  });

  it("uses defaults when a running development server still has an older Prisma client", async () => {
    await expect(getOrCreateArticleAdSettings({} as never)).resolves.toEqual(DEFAULT_ARTICLE_AD_SETTINGS);
    expect(hasArticleAdSettingsModel({} as never)).toBe(false);
  });
});
