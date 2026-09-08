import type { ArticleAdInsertionRules } from "@/lib/content/article-segments";
import { validateArticleAdInsertionRules } from "@/lib/content/article-segments";

export const ARTICLE_AD_SETTING_ID = "default";
export const DEFAULT_ARTICLE_AD_SETTINGS = {
  middleAdInterval: 2,
  maxMiddleAds: 3,
  categoryInlineAdInterval: 10,
  anchorAdsEnabled: false,
  anchorAdsOnArticles: true,
  anchorAdsOnHome: true,
  anchorAdsOnCategories: true,
} as const;

export type ArticleAdSettings = ArticleAdInsertionRules & {
  categoryInlineAdInterval: number;
  anchorAdsEnabled: boolean;
  anchorAdsOnArticles: boolean;
  anchorAdsOnHome: boolean;
  anchorAdsOnCategories: boolean;
};

type ArticleAdSettingsClient = {
  articleAdSetting?: {
    upsert: (args: {
      where: { id: string };
      create: { id: string } & ArticleAdSettings;
      update: Partial<ArticleAdSettings>;
    }) => Promise<ArticleAdSettings>;
  };
};

export function hasArticleAdSettingsModel(client: ArticleAdSettingsClient) {
  return Boolean(client.articleAdSetting);
}

export function validateArticleAdSettings<T extends ArticleAdInsertionRules & { categoryInlineAdInterval?: number }>(settings: T) {
  validateArticleAdInsertionRules(settings);
  if (settings.categoryInlineAdInterval !== undefined && (!Number.isInteger(settings.categoryInlineAdInterval) || settings.categoryInlineAdInterval < 4 || settings.categoryInlineAdInterval > 20)) {
    throw new Error("categoryInlineAdInterval 必須是 4 至 20 的整數");
  }
  return settings;
}

function isMissingAdSettingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const details = `${error instanceof Error ? error.message : ""} ${JSON.stringify(error)}`;
  const missingDatabaseColumn = "code" in error
    && error.code === "P2022"
    && /ArticleAdSetting\.(?:anchorAds(?:Enabled|OnArticles|OnHome|OnCategories)|categoryInlineAdInterval)/.test(details);
  const stalePrismaClient = /Unknown argument [`'"]categoryInlineAdInterval[`'"]/.test(details);
  return missingDatabaseColumn || stalePrismaClient;
}

export async function getOrCreateArticleAdSettings(client: ArticleAdSettingsClient): Promise<ArticleAdSettings> {
  const articleAdSetting = client.articleAdSetting;
  if (!articleAdSetting) return DEFAULT_ARTICLE_AD_SETTINGS;
  let settings: ArticleAdSettings;
  try {
    settings = await articleAdSetting.upsert({
      where: { id: ARTICLE_AD_SETTING_ID },
      create: { id: ARTICLE_AD_SETTING_ID, ...DEFAULT_ARTICLE_AD_SETTINGS },
      update: {},
    });
  } catch (error) {
    if (isMissingAdSettingColumnError(error)) return DEFAULT_ARTICLE_AD_SETTINGS;
    throw error;
  }
  return validateArticleAdSettings({
    middleAdInterval: settings.middleAdInterval,
    maxMiddleAds: settings.maxMiddleAds,
    categoryInlineAdInterval: settings.categoryInlineAdInterval,
    anchorAdsEnabled: settings.anchorAdsEnabled,
    anchorAdsOnArticles: settings.anchorAdsOnArticles,
    anchorAdsOnHome: settings.anchorAdsOnHome,
    anchorAdsOnCategories: settings.anchorAdsOnCategories,
  });
}
