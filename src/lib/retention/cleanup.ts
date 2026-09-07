import type { PrismaClient } from "@prisma/client";
import type { RetentionSettings } from "./settings";

const DAY_MS = 86_400_000;

export type CleanupSummary = {
  llmUsage: number;
  trafficSyncRun: number;
  searchSuccess: number;
  searchFailure: number;
  imageGeneration: number;
  publicInvalidation: number;
  sessions: number;
  databaseBackups: number;
  totalDeleted: number;
};

function cutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

export async function runDataRetentionCleanup(client: PrismaClient, settings: RetentionSettings, now = new Date()): Promise<CleanupSummary> {
  const results = await Promise.all([
    client.lLMUsage.deleteMany({ where: { createdAt: { lt: cutoff(now, settings.llmUsageDays) } } }),
    client.trafficSyncRun.deleteMany({ where: { startedAt: { lt: cutoff(now, settings.trafficSyncRunDays) }, status: { in: ["SUCCESS", "FAILURE"] } } }),
    client.searchEngineNotification.deleteMany({ where: { createdAt: { lt: cutoff(now, settings.searchSuccessDays) }, status: "SUCCESS" } }),
    client.searchEngineNotification.deleteMany({ where: { createdAt: { lt: cutoff(now, settings.searchFailureDays) }, status: "FAILED" } }),
    client.imageGeneration.deleteMany({ where: { createdAt: { lt: cutoff(now, settings.imageGenerationDays) }, status: { in: ["READY", "FAILED"] }, imageBytes: null } }),
    client.publicInvalidation.deleteMany({ where: { createdAt: { lt: cutoff(now, settings.publicInvalidationDays) }, status: { in: ["SUCCESS", "FAILED"] } } }),
    client.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    client.databaseBackup.deleteMany({
      where: {
        OR: [
          { status: "FAILURE", completedAt: { lt: cutoff(now, settings.databaseBackupFailureDays) } },
          { status: "RUNNING", startedAt: { lt: cutoff(now, settings.databaseBackupFailureDays) } },
        ],
      },
    }),
  ]);
  const [llmUsage, trafficSyncRun, searchSuccess, searchFailure, imageGeneration, publicInvalidation, sessions, databaseBackups] = results.map(({ count }) => count);
  return { llmUsage, trafficSyncRun, searchSuccess, searchFailure, imageGeneration, publicInvalidation, sessions, databaseBackups, totalDeleted: results.reduce((total, result) => total + result.count, 0) };
}
