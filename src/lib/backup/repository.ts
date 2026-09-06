import type { PrismaClient } from "@prisma/client";

export const BACKUP_SETTING_ID = "default";

export async function getOrCreateBackupSettings(prisma: PrismaClient) {
  return prisma.databaseBackupSetting.upsert({ where: { id: BACKUP_SETTING_ID }, create: { id: BACKUP_SETTING_ID }, update: {} });
}

export async function listDatabaseBackups(prisma: PrismaClient) {
  return prisma.databaseBackup.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export function serializeBackup(backup: Awaited<ReturnType<typeof listDatabaseBackups>>[number]) {
  return { ...backup, fileSize: backup.fileSize === null ? null : Number(backup.fileSize) };
}
