import { submitGoogleSitemap, submitIndexNow } from "@/lib/search-engine/notifications";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cronSecret = process.env.SEARCH_ENGINE_CRON_SECRET || process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) return Response.json({ error: "未授權" }, { status: 401 });
  const workerId = "search-engine-worker";
  const heartbeat = await prisma.workerHeartbeat.upsert({ where: { id: workerId }, create: { id: workerId, name: "Search engine notification worker", desiredState: "RUNNING", startedAt: new Date(), lastHeartbeat: new Date() }, update: { lastHeartbeat: new Date(), lastError: null } });
  if (heartbeat.desiredState === "STOPPED") return Response.json({ summary: 0, success: 0, failure: 0, skipped: true });
  const rows = await prisma.searchEngineNotification.findMany({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: 100 });
  const bingRows = rows.filter((row) => row.engine === "bing");
  const googleRows = rows.filter((row) => row.engine === "google");
  let googleSuccess = 0;
  try {
    const result = await submitIndexNow(bingRows.map((row) => row.url));
    if (!result.skipped && bingRows.length) await prisma.searchEngineNotification.updateMany({ where: { id: { in: bingRows.map((row) => row.id) } }, data: { status: "SUCCESS", sentAt: new Date(), attempts: { increment: 1 } } });
    if (googleRows.length) {
      const googleResult = await submitGoogleSitemap();
      if (!googleResult.skipped) {
        googleSuccess = googleRows.length;
        await prisma.searchEngineNotification.updateMany({ where: { id: { in: googleRows.map((row) => row.id) } }, data: { status: "SUCCESS", sentAt: new Date(), attempts: { increment: 1 } } });
      }
    }
    await prisma.workerHeartbeat.update({ where: { id: workerId }, data: { lastHeartbeat: new Date(), processed: { increment: rows.length }, lastError: null } });
    return Response.json({ summary: rows.length, success: result.count + googleSuccess, failure: 0 });
  } catch (error) {
    if (rows.length) await prisma.searchEngineNotification.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { status: "PENDING", attempts: { increment: 1 }, lastError: error instanceof Error ? error.message : "搜尋引擎通知失敗", nextAttemptAt: new Date(Date.now() + 5 * 60_000) } });
    await prisma.workerHeartbeat.update({ where: { id: workerId }, data: { lastHeartbeat: new Date(), lastError: error instanceof Error ? error.message : "搜尋引擎通知失敗" } }).catch(() => undefined);
    return Response.json({ summary: rows.length, success: 0, failure: rows.length }, { status: 502 });
  }
}
