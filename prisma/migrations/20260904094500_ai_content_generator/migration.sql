-- CreateEnum
CREATE TYPE "AIContentType" AS ENUM ('TROUBLESHOOTING', 'HOW_TO');

-- CreateEnum
CREATE TYPE "AISourceSupport" AS ENUM ('STRONG', 'MEDIUM');

-- AlterTable
ALTER TABLE "Post"
ADD COLUMN "aiContentType" "AIContentType",
ADD COLUMN "primaryKeyword" TEXT,
ADD COLUMN "searchIntent" TEXT,
ADD COLUMN "aiSourceSupport" "AISourceSupport",
ADD COLUMN "aiNeedsVerification" JSONB;
