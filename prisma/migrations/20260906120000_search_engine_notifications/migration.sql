-- CreateEnum
CREATE TYPE "SearchNotificationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "SearchEngineNotification" (
    "id" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "SearchNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "SearchEngineNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SearchEngineNotification_engine_url_eventType_key" ON "SearchEngineNotification"("engine", "url", "eventType");
CREATE INDEX "SearchEngineNotification_status_nextAttemptAt_idx" ON "SearchEngineNotification"("status", "nextAttemptAt");
