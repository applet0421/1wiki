CREATE TABLE "DataRetentionSetting" (
    "id" TEXT NOT NULL,
    "llmUsageDays" INTEGER NOT NULL DEFAULT 180,
    "trafficDailyPageDays" INTEGER NOT NULL DEFAULT 365,
    "trafficDailySiteDays" INTEGER NOT NULL DEFAULT 730,
    "trafficSyncRunDays" INTEGER NOT NULL DEFAULT 180,
    "searchSuccessDays" INTEGER NOT NULL DEFAULT 90,
    "searchFailureDays" INTEGER NOT NULL DEFAULT 365,
    "imageGenerationDays" INTEGER NOT NULL DEFAULT 90,
    "publicInvalidationDays" INTEGER NOT NULL DEFAULT 180,
    "databaseBackupFailureDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataRetentionSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DataRetentionSetting" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
