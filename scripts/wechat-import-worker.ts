import nextEnv from "@next/env";
import { setTimeout as delay } from "node:timers/promises";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const { prisma } = await import("../src/lib/db/prisma");
const { processNextWeChatImport, recoverWeChatImportJobs } = await import("../src/lib/wechat-import/worker");

const workerId = "wechat-import-worker";
const startedAt = new Date();
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

try {
  do {
    const heartbeat = await prisma.workerHeartbeat.upsert({ where: { id: workerId }, create: { id: workerId, name: "WeChat import worker", startedAt, lastHeartbeat: new Date() }, update: { lastHeartbeat: new Date(), lastError: null } });
    if (heartbeat.desiredState === "STOPPED") { if (process.argv.includes("--once")) break; await delay(2000); continue; }
    try {
      await recoverWeChatImportJobs(prisma);
      const processed = await processNextWeChatImport(prisma);
      if (processed) await prisma.workerHeartbeat.update({ where: { id: workerId }, data: { processed: { increment: 1 }, lastHeartbeat: new Date() } });
      if (process.argv.includes("--once")) break;
      if (!processed) await delay(2000);
    } catch {
      await prisma.workerHeartbeat.updateMany({ where: { id: workerId }, data: { lastHeartbeat: new Date(), lastError: "微信匯入工作處理失敗。" } });
      if (process.argv.includes("--once")) { process.exitCode = 1; break; }
      await delay(5000);
    }
  } while (!stopping);
} finally {
  await prisma.$disconnect();
}
