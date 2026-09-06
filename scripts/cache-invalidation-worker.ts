import nextEnv from "@next/env";
import { setTimeout as delay } from "node:timers/promises";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
const { prisma } = await import("../src/lib/db/prisma");

const revalidateUrl = process.env.CACHE_REVALIDATE_URL || "http://web:3000/api/internal/cache/revalidate";
const secret = process.env.CACHE_REVALIDATE_SECRET || process.env.CRON_SECRET;

function pathsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("快取失效事件格式錯誤");
  const paths = value.filter((path): path is string => typeof path === "string" && path.startsWith("/"));
  if (!paths.length || paths.length !== value.length) throw new Error("快取失效事件包含無效路徑");
  return [...new Set(paths)];
}

async function purgeCloudflare(paths: string[]) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/u, "");
  if (!token || !zoneId || !siteUrl) return;
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ files: paths.map((path) => `${siteUrl}${path}`) }),
  });
  if (!response.ok) throw new Error(`Cloudflare purge failed: ${response.status}`);
}

async function processOne(): Promise<boolean> {
  const row = await prisma.publicInvalidation.findFirst({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" } });
  if (!row) return false;
  try {
    const paths = pathsFromJson(row.paths);
    if (!secret) throw new Error("CACHE_REVALIDATE_SECRET 未設定");
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    if (!response.ok) throw new Error(`Next revalidation failed: ${response.status}`);
    await purgeCloudflare(paths);
    await prisma.publicInvalidation.update({ where: { id: row.id }, data: { status: "SUCCESS", completedAt: new Date(), attempts: { increment: 1 }, lastError: null } });
  } catch (error) {
    const attempts = row.attempts + 1;
    await prisma.publicInvalidation.update({ where: { id: row.id }, data: { status: attempts >= 10 ? "FAILED" : "PENDING", attempts, lastError: error instanceof Error ? error.message : "快取失效失敗", nextAttemptAt: new Date(Date.now() + Math.min(attempts * 60_000, 15 * 60_000)) } });
  }
  return true;
}

let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

try {
  do {
    const processed = await processOne();
    if (!processed) await delay(2000);
  } while (!stopping);
} finally {
  await prisma.$disconnect();
}
