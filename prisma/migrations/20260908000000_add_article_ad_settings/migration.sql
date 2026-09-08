CREATE TABLE "ArticleAdSetting" (
    "id" TEXT NOT NULL,
    "middleAdInterval" INTEGER NOT NULL DEFAULT 2,
    "maxMiddleAds" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleAdSetting_pkey" PRIMARY KEY ("id")
);
