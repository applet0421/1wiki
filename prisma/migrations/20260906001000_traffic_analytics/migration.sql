CREATE TYPE "TrafficSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILURE');

CREATE TABLE "TrafficDailyPage" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "pagePath" TEXT NOT NULL,
  "pageTitle" TEXT NOT NULL DEFAULT '',
  "pageType" TEXT NOT NULL,
  "locale" TEXT,
  "postId" TEXT,
  "categoryId" TEXT,
  "views" INTEGER NOT NULL DEFAULT 0,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "engagedSessions" INTEGER NOT NULL DEFAULT 0,
  "engagementSeconds" INTEGER NOT NULL DEFAULT 0,
  "entrances" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrafficDailyPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrafficSyncRun" (
  "id" TEXT NOT NULL,
  "status" "TrafficSyncStatus" NOT NULL DEFAULT 'RUNNING',
  "fromDate" DATE NOT NULL,
  "toDate" DATE NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "error" VARCHAR(500),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "TrafficSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrafficDailySite" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "engagedSessions" INTEGER NOT NULL DEFAULT 0,
  "engagementSeconds" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrafficDailySite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrafficDailyPage_date_pagePath_key" ON "TrafficDailyPage"("date", "pagePath");
CREATE INDEX "TrafficDailyPage_date_idx" ON "TrafficDailyPage"("date");
CREATE INDEX "TrafficDailyPage_locale_date_idx" ON "TrafficDailyPage"("locale", "date");
CREATE INDEX "TrafficDailyPage_categoryId_date_idx" ON "TrafficDailyPage"("categoryId", "date");
CREATE INDEX "TrafficDailyPage_postId_date_idx" ON "TrafficDailyPage"("postId", "date");
CREATE INDEX "TrafficSyncRun_startedAt_idx" ON "TrafficSyncRun"("startedAt");
CREATE INDEX "TrafficSyncRun_status_startedAt_idx" ON "TrafficSyncRun"("status", "startedAt");
CREATE UNIQUE INDEX "TrafficDailySite_date_key" ON "TrafficDailySite"("date");
CREATE INDEX "TrafficDailySite_date_idx" ON "TrafficDailySite"("date");
ALTER TABLE "TrafficDailyPage" ADD CONSTRAINT "TrafficDailyPage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrafficDailyPage" ADD CONSTRAINT "TrafficDailyPage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
