import { supportedLocales, type Locale } from "@/lib/i18n/config";
import type { PrismaClient } from "@prisma/client";

type RawFilters = { from?: string; to?: string; locale?: string };
export type TrafficFilters = { from: Date; to: Date; locale?: Locale };

function taiwanDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function validDate(value?: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : null; }

export function parseTrafficFilters(raw: RawFilters, now = new Date()): TrafficFilters {
  const today = new Date(`${taiwanDate(now)}T00:00:00.000Z`);
  const fallbackFrom = new Date(today);
  fallbackFrom.setUTCDate(fallbackFrom.getUTCDate() - 29);
  const from = validDate(raw.from) || fallbackFrom;
  const to = validDate(raw.to) || today;
  return { from, to, locale: supportedLocales.includes(raw.locale as Locale) ? raw.locale as Locale : undefined };
}

export async function getTrafficDashboard(client: PrismaClient, filters: TrafficFilters) {
  const date = { gte: filters.from, lte: filters.to };
  const localeWhere = filters.locale ? { locale: filters.locale } : {};
  const [site, pages, lastSync] = await Promise.all([
    client.trafficDailySite.findMany({ where: { date }, orderBy: { date: "asc" } }),
    client.trafficDailyPage.findMany({ where: { date, ...localeWhere }, include: { post: { select: { id: true, title: true } }, category: { select: { id: true, name: true } } } }),
    client.trafficSyncRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);
  const sum = (key: "views" | "activeUsers" | "sessions" | "engagedSessions" | "engagementSeconds") => site.reduce((total, row) => total + row[key], 0);
  const views = sum("views"), users = sum("activeUsers"), sessions = sum("sessions"), engaged = sum("engagedSessions"), seconds = sum("engagementSeconds");
  const categoryMap = new Map<string, { id: string; name: string; views: number; activeUsers: number }>();
  const postMap = new Map<string, { id: string; title: string; views: number; activeUsers: number; engagementSeconds: number }>();
  for (const row of pages) {
    if (row.category) { const item = categoryMap.get(row.category.id) || { ...row.category, views: 0, activeUsers: 0 }; item.views += row.views; item.activeUsers += row.activeUsers; categoryMap.set(item.id, item); }
    if (row.post) { const item = postMap.get(row.post.id) || { ...row.post, views: 0, activeUsers: 0, engagementSeconds: 0 }; item.views += row.views; item.activeUsers += row.activeUsers; item.engagementSeconds += row.engagementSeconds; postMap.set(item.id, item); }
  }
  return {
    totals: { views, activeUsers: site.length ? Math.round(users / site.length) : 0, sessions, engagementRate: sessions ? engaged / sessions : null, averageEngagementSeconds: users ? seconds / users : null },
    daily: site.map(({ date, views, activeUsers }) => ({ date, views, activeUsers })),
    categories: [...categoryMap.values()].sort((a, b) => b.views - a.views).slice(0, 10),
    posts: [...postMap.values()].sort((a, b) => b.views - a.views).slice(0, 20).map((row) => ({ ...row, engagementSeconds: row.activeUsers ? row.engagementSeconds / row.activeUsers : 0 })),
    lastSync,
  };
}
