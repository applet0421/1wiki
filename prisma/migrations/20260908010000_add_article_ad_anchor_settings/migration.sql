ALTER TABLE "ArticleAdSetting"
  ADD COLUMN "anchorAdsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anchorAdsOnArticles" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "anchorAdsOnHome" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "anchorAdsOnCategories" BOOLEAN NOT NULL DEFAULT true;
