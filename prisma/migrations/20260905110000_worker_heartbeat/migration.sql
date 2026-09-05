CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);
