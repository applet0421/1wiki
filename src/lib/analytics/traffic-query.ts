import { supportedLocales, type Locale } from "@/lib/i18n/config";
import type { PrismaClient } from "@prisma/client";

type RawFilters = { locale?: string };
export type TrafficFilters = { locale?: Locale };

export function parseTrafficFilters(raw: RawFilters): TrafficFilters {
  return { locale: supportedLocales.includes(raw.locale as Locale) ? raw.locale as Locale : undefined };
}

export async function getTrafficDashboard(client: PrismaClient, filters?: TrafficFilters) {
  void filters;
  const localeWhere = filters?.locale ? { locale: filters.locale } : {};
  const [pages, lastSync] = await Promise.all([
    client.trafficPageTotal.findMany({ where: localeWhere, include: { post: { select: { id: true, title: true } }, category: { select: { id: true, name: true } } } }),
    client.trafficSyncRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const views = pages.reduce((total, row) => total + row.views, 0);
  const categoryMap = new Map<string, { id: string; name: string; views: number }>();
  const postMap = new Map<string, { id: string; title: string; views: number }>();
  for (const row of pages) {
    if (row.category) { const item = categoryMap.get(row.category.id) || { ...row.category, views: 0 }; item.views += row.views; categoryMap.set(item.id, item); }
    if (row.post) { const item = postMap.get(row.post.id) || { ...row.post, views: 0 }; item.views += row.views; postMap.set(item.id, item); }
  }
  return {
    totals: { views },
    categories: [...categoryMap.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    posts: [...postMap.values()].sort((a, b) => b.views - a.views).slice(0, 20),
    lastSync,
  };
}
