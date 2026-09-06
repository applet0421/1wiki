import nextEnv from "@next/env";
import { setTimeout as delay } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { scheduleKeyFor, isDailyBackupDue } from "../src/lib/backup/schedule";
import { runDatabaseBackup } from "../src/lib/backup/runner";
import { prisma } from "../src/lib/db/prisma";
import { getOrCreateBackupSettings } from "../src/lib/backup/repository";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const workerId = "database-backup-worker";
const startedAt = new Date();
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

async function processSchedule() {
  const manual = await prisma.databaseBackup.findFirst({ where: { status: "RUNNING", trigger: "MANUAL" }, orderBy: { createdAt: "asc" } });
  if (manual) { await runDatabaseBackup(manual.id); return true; }
  const settings = await getOrCreateBackupSettings(prisma);
  const now = new Date();
  if (!settings.enabled || !isDailyBackupDue(now, settings.dailyTime, settings.timezone)) return false;
  const scheduleKey = scheduleKeyFor(now, settings.timezone);
  try {
    const backup = await prisma.databaseBackup.create({ data: { trigger: "SCHEDULE", scheduleKey } });
    await runDatabaseBackup(backup.id);
    const successes = await prisma.databaseBackup.findMany({ where: { status: "SUCCESS" }, orderBy: { createdAt: "desc" }, skip: settings.retentionCount, select: { id: true, objectKey: true } });
    if (successes.length) {
      const { getBackupR2Configuration, deleteBackupObject } = await import("../src/lib/backup/r2-backups");
      const config = getBackupR2Configuration();
      for (const old of successes) { if (old.objectKey) await deleteBackupObject(config, old.objectKey); await prisma.databaseBackup.delete({ where: { id: old.id } }); }
    }
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

console.log("Database backup worker ready");
try {
  do {
    try {
      const heartbeat = await prisma.workerHeartbeat.upsert({ where: { id: workerId }, create: { id: workerId, name: "Database backup worker", startedAt, lastHeartbeat: new Date() }, update: { lastHeartbeat: new Date(), lastError: null } });
      if (heartbeat.desiredState !== "STOPPED") await processSchedule();
      if (process.argv.includes("--once")) break;
      await delay(30_000);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "備份 Worker 發生錯誤";
      await prisma.workerHeartbeat.updateMany({ where: { id: workerId }, data: { lastHeartbeat: new Date(), lastError: message } }).catch(() => undefined);
      console.error("Database backup worker failed; retrying in 30 seconds", error);
      if (process.argv.includes("--once")) { process.exitCode = 1; break; }
      await delay(30_000);
    }
  } while (!stopping);
} finally { await prisma.$disconnect(); }
