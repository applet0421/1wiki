import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ARTICLE_AD_SETTINGS, getOrCreateArticleAdSettings, hasArticleAdSettingsModel, validateArticleAdSettings } from "./article-ad-settings";

describe("article ad settings", () => {
  it("accepts configured values within the safe owner ranges", () => {
    expect(validateArticleAdSettings({ middleAdInterval: 6, maxMiddleAds: 5, categoryInlineAdInterval: 20 })).toEqual({ middleAdInterval: 6, maxMiddleAds: 5, categoryInlineAdInterval: 20 });
  });

  it("defaults Anchor ads off while keeping eligible public page types ready", () => {
    expect(DEFAULT_ARTICLE_AD_SETTINGS).toMatchObject({
      anchorAdsEnabled: false,
      anchorAdsOnArticles: true,
      anchorAdsOnHome: true,
      anchorAdsOnCategories: true,
      categoryInlineAdInterval: 10,
    });
  });

  it("rejects an interval or cap outside the safe owner ranges", () => {
    expect(() => validateArticleAdSettings({ middleAdInterval: 0, maxMiddleAds: 3 })).toThrow(/middleAdInterval/);
    expect(() => validateArticleAdSettings({ middleAdInterval: 2, maxMiddleAds: 6 })).toThrow(/maxMiddleAds/);
    expect(() => validateArticleAdSettings({ middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 3 })).toThrow(/categoryInlineAdInterval/);
    expect(() => validateArticleAdSettings({ middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 21 })).toThrow(/categoryInlineAdInterval/);
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

  it("uses defaults while the database is missing the new Anchor columns", async () => {
    const upsert = vi.fn().mockRejectedValue({
      code: "P2022",
      meta: { modelName: "ArticleAdSetting", column: "ArticleAdSetting.anchorAdsEnabled" },
    });

    await expect(getOrCreateArticleAdSettings({ articleAdSetting: { upsert } } as never))
      .resolves.toEqual(DEFAULT_ARTICLE_AD_SETTINGS);
  });

  it("uses defaults while the database is missing the category Inline interval column", async () => {
    const upsert = vi.fn().mockRejectedValue({
      code: "P2022",
      meta: { modelName: "ArticleAdSetting", column: "ArticleAdSetting.categoryInlineAdInterval" },
    });

    await expect(getOrCreateArticleAdSettings({ articleAdSetting: { upsert } } as never))
      .resolves.toEqual(DEFAULT_ARTICLE_AD_SETTINGS);
  });

  it("uses defaults when a running development server still has the pre-migration Prisma model", async () => {
    const upsert = vi.fn().mockRejectedValue(new Error(`Invalid prisma.articleAdSetting.upsert() invocation:\nUnknown argument \`categoryInlineAdInterval\`. Available options are marked with ?.`));

    await expect(getOrCreateArticleAdSettings({ articleAdSetting: { upsert } } as never))
      .resolves.toEqual(DEFAULT_ARTICLE_AD_SETTINGS);
  });
});
