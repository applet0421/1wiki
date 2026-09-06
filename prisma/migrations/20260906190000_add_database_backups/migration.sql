CREATE TYPE "DatabaseBackupStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILURE');
CREATE TYPE "DatabaseBackupTrigger" AS ENUM ('SCHEDULE', 'MANUAL');

CREATE TABLE "DatabaseBackupSetting" (
  "id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "dailyTime" TEXT NOT NULL DEFAULT '02:00',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Taipei',
  "retentionCount" INTEGER NOT NULL DEFAULT 7,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DatabaseBackupSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseBackup" (
  "id" TEXT NOT NULL,
  "status" "DatabaseBackupStatus" NOT NULL DEFAULT 'RUNNING',
  "trigger" "DatabaseBackupTrigger" NOT NULL,
  "scheduleKey" TEXT,
  "objectKey" TEXT,
  "fileName" VARCHAR(255),
  "fileSize" BIGINT,
  "checksum" VARCHAR(64),
  "error" VARCHAR(1000),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DatabaseBackup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DatabaseBackup_scheduleKey_key" ON "DatabaseBackup"("scheduleKey");
CREATE INDEX "DatabaseBackup_status_startedAt_idx" ON "DatabaseBackup"("status", "startedAt");
CREATE INDEX "DatabaseBackup_createdAt_idx" ON "DatabaseBackup"("createdAt");
