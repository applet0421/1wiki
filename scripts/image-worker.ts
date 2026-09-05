import nextEnv from "@next/env";
import { setTimeout as delay } from "node:timers/promises";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const { prisma } = await import("../src/lib/db/prisma");
const { processNextImageJob, recoverImageJobs } = await import("../src/lib/ai/image-worker");
const workerId = "image-worker";
const startedAt = new Date();
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
console.log("AI image worker ready");
try {
  do {
    try {
      await prisma.workerHeartbeat.upsert({ where: { id: workerId }, create: { id: workerId, name: "AI image worker", startedAt, lastHeartbeat: new Date() }, update: { lastHeartbeat: new Date(), lastError: null } });
      await recoverImageJobs(prisma);
      const processed = await processNextImageJob(prisma);
      if (processed) await prisma.workerHeartbeat.update({ where: { id: workerId }, data: { lastHeartbeat: new Date(), processed: { increment: 1 } } });
      if (process.argv.includes("--once")) break;
      if (!processed) await delay(2000);
    } catch {
      try { await prisma.workerHeartbeat.updateMany({ where: { id: workerId }, data: { lastHeartbeat: new Date(), lastError: "Worker 處理佇列時發生錯誤。" } }); } catch { /* Database may be temporarily unavailable. */ }
      console.error("AI image worker could not process queue; retrying in 5 seconds");
      if (process.argv.includes("--once")) { process.exitCode = 1; break; }
      await delay(5000);
    }
  } while (!stopping);
} finally { await prisma.$disconnect(); }
