import type { ArticleAdInsertionRules } from "@/lib/content/article-segments";
import { validateArticleAdInsertionRules } from "@/lib/content/article-segments";

export const ARTICLE_AD_SETTING_ID = "default";
export const DEFAULT_ARTICLE_AD_SETTINGS = {
  middleAdInterval: 2,
  maxMiddleAds: 3,
} as const;

type ArticleAdSettingsClient = {
  articleAdSetting?: {
    upsert: (args: {
      where: { id: string };
      create: { id: string } & ArticleAdInsertionRules;
      update: Partial<ArticleAdInsertionRules>;
    }) => Promise<ArticleAdInsertionRules>;
  };
};

export function hasArticleAdSettingsModel(client: ArticleAdSettingsClient) {
  return Boolean(client.articleAdSetting);
}

export function validateArticleAdSettings(settings: ArticleAdInsertionRules) {
  return validateArticleAdInsertionRules(settings);
}

export async function getOrCreateArticleAdSettings(client: ArticleAdSettingsClient): Promise<ArticleAdInsertionRules> {
  const articleAdSetting = client.articleAdSetting;
  if (!articleAdSetting) return DEFAULT_ARTICLE_AD_SETTINGS;
  const settings = await articleAdSetting.upsert({
    where: { id: ARTICLE_AD_SETTING_ID },
    create: { id: ARTICLE_AD_SETTING_ID, ...DEFAULT_ARTICLE_AD_SETTINGS },
    update: {},
  });
  return validateArticleAdSettings({
    middleAdInterval: settings.middleAdInterval,
    maxMiddleAds: settings.maxMiddleAds,
  });
}
