import type { PrismaClient } from "@prisma/client";

export const DATA_RETENTION_SETTING_ID = "default";

export const DEFAULT_RETENTION_SETTINGS = {
  llmUsageDays: 180,
  trafficSyncRunDays: 180,
  searchSuccessDays: 90,
  searchFailureDays: 365,
  imageGenerationDays: 90,
  publicInvalidationDays: 180,
  databaseBackupFailureDays: 30,
} as const;

export type RetentionSettings = {
  [K in keyof typeof DEFAULT_RETENTION_SETTINGS]: number;
};

export function validateRetentionSettings(input: RetentionSettings): RetentionSettings {
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isInteger(value) || value < 1 || value > 3650) throw new Error(`${key} 必須是 1 至 3650 的整數`);
  }
  return input;
}

export async function getOrCreateRetentionSettings(client: PrismaClient): Promise<RetentionSettings> {
  const row = await client.dataRetentionSetting.upsert({
    where: { id: DATA_RETENTION_SETTING_ID },
    create: { id: DATA_RETENTION_SETTING_ID, ...DEFAULT_RETENTION_SETTINGS },
    update: {},
  });
  return {
    llmUsageDays: row.llmUsageDays,
    trafficSyncRunDays: row.trafficSyncRunDays,
    searchSuccessDays: row.searchSuccessDays,
    searchFailureDays: row.searchFailureDays,
    imageGenerationDays: row.imageGenerationDays,
    publicInvalidationDays: row.publicInvalidationDays,
    databaseBackupFailureDays: row.databaseBackupFailureDays,
  };
}
