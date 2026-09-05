import type { PrismaClient } from "@prisma/client";
import { getSiteUrl } from "@/lib/config/site";
import type { SearchEvent } from "./notifications";

export function articleUrl(locale: string, slug: string) { return `${getSiteUrl()}/${locale}/articles/${slug}`; }

export async function enqueueSearchNotification(client: PrismaClient, url: string, eventType: SearchEvent) {
  return client.searchEngineNotification.upsert({ where: { engine_url_eventType: { engine: "bing", url, eventType } }, create: { engine: "bing", url, eventType }, update: { status: "PENDING", nextAttemptAt: new Date(), lastError: null } });
}

export async function getSearchEngineSummary(client: PrismaClient) {
  try {
    const [pending, success, failed, recent] = await Promise.all([
      client.searchEngineNotification.count({ where: { status: "PENDING" } }),
      client.searchEngineNotification.count({ where: { status: "SUCCESS" } }),
      client.searchEngineNotification.count({ where: { status: "FAILED" } }),
      client.searchEngineNotification.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return { pending, success, failed, recent };
  } catch {
    return { pending: 0, success: 0, failed: 0, recent: [] };
  }
}
