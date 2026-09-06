"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { BACKUP_SETTING_ID } from "@/lib/backup/repository";
import { validateBackupSettings } from "@/lib/backup/schedule";
import { createBackupDownloadUrl, getBackupR2Configuration } from "@/lib/backup/r2-backups";
import { DATA_RETENTION_SETTING_ID, validateRetentionSettings, type RetentionSettings } from "@/lib/retention/settings";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
}

export async function saveBackupSettingsAction(formData: FormData) {
  await requireOwner();
  try {
    const dailyTime = String(formData.get("dailyTime") || "");
    const timezone = String(formData.get("timezone") || "");
    const retentionCount = Number(formData.get("retentionCount"));
    validateBackupSettings({ dailyTime, timezone, retentionCount });
    await prisma.databaseBackupSetting.upsert({ where: { id: BACKUP_SETTING_ID }, create: { id: BACKUP_SETTING_ID, enabled: formData.get("enabled") === "on", dailyTime, timezone, retentionCount }, update: { enabled: formData.get("enabled") === "on", dailyTime, timezone, retentionCount } });
    revalidatePath("/admin/database-backups");
    redirect("/admin/database-backups?success=settings");
  } catch (error) {
    const message = error instanceof Error ? error.message : "備份設定儲存失敗";
    redirect(`/admin/database-backups?error=${encodeURIComponent(message)}`);
  }
}

export async function saveRetentionSettingsAction(formData: FormData) {
  await requireOwner();
  try {
    const settings = Object.fromEntries([
      "llmUsageDays", "trafficSyncRunDays",
      "searchSuccessDays", "searchFailureDays", "imageGenerationDays", "publicInvalidationDays",
      "databaseBackupFailureDays",
    ].map((key) => [key, Number(formData.get(key))])) as RetentionSettings;
    validateRetentionSettings(settings);
    await prisma.dataRetentionSetting.upsert({ where: { id: DATA_RETENTION_SETTING_ID }, create: { id: DATA_RETENTION_SETTING_ID, ...settings }, update: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "資料清理設定儲存失敗";
    redirect(`/admin/database-backups?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/database-backups");
  redirect("/admin/database-backups?success=retention-settings");
}

export async function createManualBackupAction() {
  await requireOwner();
  await prisma.databaseBackup.create({ data: { trigger: "MANUAL" } });
  revalidatePath("/admin/database-backups");
  redirect("/admin/database-backups?success=started");
}

export async function downloadBackupAction(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id") || "");
  const backup = await prisma.databaseBackup.findUnique({ where: { id } });
  if (!backup?.objectKey || backup.status !== "SUCCESS") redirect("/admin/database-backups?error=備份尚未完成");
  const url = await createBackupDownloadUrl(getBackupR2Configuration(), backup.objectKey);
  redirect(url);
}
