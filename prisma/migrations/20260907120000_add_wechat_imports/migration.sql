CREATE TYPE "WeChatImportStatus" AS ENUM ('FETCH_QUEUED', 'FETCHING', 'FETCHED', 'REWRITE_QUEUED', 'REWRITING', 'REWRITTEN', 'TRANSFER_QUEUED', 'TRANSFERRING', 'TRANSFER_FAILED', 'READY', 'FAILED', 'UNKNOWN', 'ABANDONED', 'EXPIRED');
CREATE TYPE "WeChatRewriteMode" AS ENUM ('FAITHFUL', 'DEEP_SEO');
CREATE TYPE "WeChatAssetStatus" AS ENUM ('STAGED', 'UPLOADING', 'READY', 'FAILED', 'REMOVED');

ALTER TABLE "Post" ADD COLUMN "sourceImportId" TEXT;
ALTER TABLE "DataRetentionSetting" ADD COLUMN "weChatImportHours" INTEGER NOT NULL DEFAULT 24;

CREATE TABLE "WeChatImport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "WeChatImportStatus" NOT NULL DEFAULT 'FETCH_QUEUED',
  "sourceUrl" TEXT NOT NULL,
  "normalizedUrl" TEXT NOT NULL,
  "sourceTitle" TEXT,
  "sourceAccountName" TEXT,
  "sourceAuthor" TEXT,
  "sourcePublishedAt" TIMESTAMP(3),
  "sourceCoverUrl" TEXT,
  "sourceContentHtml" TEXT,
  "sourceBlocks" JSONB,
  "sourceContentHash" VARCHAR(64),
  "fetchMethod" VARCHAR(20),
  "targetLocale" TEXT NOT NULL,
  "rewriteMode" "WeChatRewriteMode" NOT NULL DEFAULT 'FAITHFUL',
  "rewrittenDraft" JSONB,
  "editorDraft" JSONB,
  "failureStage" VARCHAR(40),
  "errorCode" VARCHAR(80),
  "errorSummary" VARCHAR(500),
  "report" JSONB,
  "leaseExpiresAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WeChatImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeChatImportAsset" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "isCover" BOOLEAN NOT NULL DEFAULT false,
  "originalUrl" TEXT NOT NULL,
  "status" "WeChatAssetStatus" NOT NULL DEFAULT 'STAGED',
  "mimeType" VARCHAR(100) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "sha256" VARCHAR(64) NOT NULL,
  "alt" TEXT NOT NULL,
  "imageBytes" BYTEA,
  "objectKey" TEXT,
  "publicUrl" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorCode" VARCHAR(80),
  "errorSummary" VARCHAR(500),
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeChatImportAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Post_sourceImportId_key" ON "Post"("sourceImportId");
CREATE UNIQUE INDEX "WeChatImportAsset_importId_position_key" ON "WeChatImportAsset"("importId", "position");
CREATE INDEX "WeChatImport_status_createdAt_idx" ON "WeChatImport"("status", "createdAt");
CREATE INDEX "WeChatImport_userId_updatedAt_idx" ON "WeChatImport"("userId", "updatedAt");
CREATE INDEX "WeChatImport_sourceContentHash_idx" ON "WeChatImport"("sourceContentHash");
CREATE INDEX "WeChatImport_expiresAt_status_idx" ON "WeChatImport"("expiresAt", "status");
CREATE INDEX "WeChatImportAsset_importId_status_idx" ON "WeChatImportAsset"("importId", "status");
CREATE INDEX "WeChatImportAsset_status_updatedAt_idx" ON "WeChatImportAsset"("status", "updatedAt");

ALTER TABLE "Post" ADD CONSTRAINT "Post_sourceImportId_fkey"
  FOREIGN KEY ("sourceImportId") REFERENCES "WeChatImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WeChatImport" ADD CONSTRAINT "WeChatImport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeChatImportAsset" ADD CONSTRAINT "WeChatImportAsset_importId_fkey"
  FOREIGN KEY ("importId") REFERENCES "WeChatImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
