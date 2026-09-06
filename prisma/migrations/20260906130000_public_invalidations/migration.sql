-- CreateEnum
CREATE TYPE "PublicInvalidationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "PublicInvalidation" (
    "id" TEXT NOT NULL,
    "paths" JSONB NOT NULL,
    "status" "PublicInvalidationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "PublicInvalidation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicInvalidation_status_nextAttemptAt_idx" ON "PublicInvalidation"("status", "nextAttemptAt");
