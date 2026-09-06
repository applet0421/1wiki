CREATE TABLE "TrafficPageTotal" (
    "id" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT '',
    "pageType" TEXT NOT NULL,
    "locale" TEXT,
    "postId" TEXT,
    "categoryId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrafficPageTotal_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TrafficPageTotal" ("id", "pagePath", "pageTitle", "pageType", "locale", "postId", "categoryId", "views", "syncedAt")
SELECT
    md5("pagePath"),
    "pagePath",
    max("pageTitle"),
    max("pageType"),
    max("locale"),
    max("postId"),
    max("categoryId"),
    sum("views"),
    max("syncedAt")
FROM "TrafficDailyPage"
GROUP BY "pagePath";

CREATE UNIQUE INDEX "TrafficPageTotal_pagePath_key" ON "TrafficPageTotal"("pagePath");
CREATE INDEX "TrafficPageTotal_locale_idx" ON "TrafficPageTotal"("locale");
CREATE INDEX "TrafficPageTotal_categoryId_idx" ON "TrafficPageTotal"("categoryId");
CREATE INDEX "TrafficPageTotal_postId_idx" ON "TrafficPageTotal"("postId");
ALTER TABLE "TrafficPageTotal" ADD CONSTRAINT "TrafficPageTotal_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrafficPageTotal" ADD CONSTRAINT "TrafficPageTotal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE "TrafficDailyPage";
DROP TABLE "TrafficDailySite";

ALTER TABLE "DataRetentionSetting" DROP COLUMN "trafficDailyPageDays";
ALTER TABLE "DataRetentionSetting" DROP COLUMN "trafficDailySiteDays";
