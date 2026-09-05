import { createSign } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { classifyPagePath } from "./page-context";

type Header = { name: string };
type Ga4Report = { dimensionHeaders?: Header[]; metricHeaders?: Header[]; rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };

export function parseGa4ReportRows(report: Ga4Report): Record<string, string | number>[] {
  const dimensions = report.dimensionHeaders || [], metrics = report.metricHeaders || [];
  return (report.rows || []).map((row) => Object.fromEntries([
    ...dimensions.map((header, index) => [header.name, row.dimensionValues?.[index]?.value || ""]),
    ...metrics.map((header, index) => [header.name, Number(row.metricValues?.[index]?.value || 0)]),
  ]));
}

function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} 尚未設定`); return value; }
function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }

async function accessToken(fetcher: typeof fetch) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: required("GA4_SERVICE_ACCOUNT_EMAIL"), scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256"); signer.update(`${header}.${payload}`); signer.end();
  const assertion = `${header}.${payload}.${signer.sign(required("GA4_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n"), "base64url")}`;
  const response = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const body = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) throw new Error(body.error_description || "無法取得 GA4 access token");
  return body.access_token;
}

async function runReport(token: string, body: object, fetcher: typeof fetch): Promise<Ga4Report> {
  const property = required("GA4_PROPERTY_ID").replace(/^properties\//, "");
  const response = await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as Ga4Report & { error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || "GA4 Data API 查詢失敗");
  return result;
}

const metrics = ["screenPageViews", "activeUsers", "sessions", "engagedSessions", "userEngagementDuration", "entrances"].map((name) => ({ name }));
const iso = (date: Date) => date.toISOString().slice(0, 10);
const gaDate = (value: string) => new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`);
const count = (row: Record<string, string | number>, key: string) => Math.round(Number(row[key] || 0));

export async function syncGa4Traffic(client: PrismaClient, from: Date, to: Date, fetcher: typeof fetch = fetch) {
  const run = await client.trafficSyncRun.create({ data: { fromDate: from, toDate: to } });
  try {
    const token = await accessToken(fetcher);
    const dateRanges = [{ startDate: iso(from), endDate: iso(to) }];
    const [siteReport, pageReport, posts, categories] = await Promise.all([
      runReport(token, { dateRanges, dimensions: [{ name: "date" }], metrics, limit: "100000" }, fetcher),
      runReport(token, { dateRanges, dimensions: [{ name: "date" }, { name: "pagePath" }, { name: "pageTitle" }], metrics, limit: "100000" }, fetcher),
      client.post.findMany({ select: { id: true, slug: true, locale: true, categoryId: true } }),
      client.category.findMany({ select: { id: true, slug: true, locale: true } }),
    ]);
    const postMap = new Map(posts.map((post) => [`${post.locale}:${post.slug}`, post]));
    const categoryMap = new Map(categories.map((category) => [`${category.locale}:${category.slug}`, category]));
    const siteRows = parseGa4ReportRows(siteReport), pageRows = parseGa4ReportRows(pageReport);
    await client.$transaction([
      ...siteRows.map((row) => client.trafficDailySite.upsert({ where: { date: gaDate(String(row.date)) }, create: { date: gaDate(String(row.date)), views: count(row, "screenPageViews"), activeUsers: count(row, "activeUsers"), sessions: count(row, "sessions"), engagedSessions: count(row, "engagedSessions"), engagementSeconds: count(row, "userEngagementDuration") }, update: { views: count(row, "screenPageViews"), activeUsers: count(row, "activeUsers"), sessions: count(row, "sessions"), engagedSessions: count(row, "engagedSessions"), engagementSeconds: count(row, "userEngagementDuration"), syncedAt: new Date() } })),
      ...pageRows.flatMap((row) => {
        const pagePath = String(row.pagePath).split("?")[0]; const context = classifyPagePath(pagePath); if (!context) return [];
        const post = context.pageType === "article" ? postMap.get(`${context.locale}:${context.contentSlug}`) : undefined;
        const category = context.pageType === "category" ? categoryMap.get(`${context.locale}:${context.categorySlug}`) : post ? categories.find((item) => item.id === post.categoryId) : undefined;
        const data = { pageTitle: String(row.pageTitle || ""), pageType: context.pageType, locale: context.locale, postId: post?.id || null, categoryId: category?.id || null, views: count(row, "screenPageViews"), activeUsers: count(row, "activeUsers"), sessions: count(row, "sessions"), engagedSessions: count(row, "engagedSessions"), engagementSeconds: count(row, "userEngagementDuration"), entrances: count(row, "entrances"), syncedAt: new Date() };
        return [client.trafficDailyPage.upsert({ where: { date_pagePath: { date: gaDate(String(row.date)), pagePath } }, create: { date: gaDate(String(row.date)), pagePath, ...data }, update: data })];
      }),
    ]);
    await client.trafficSyncRun.update({ where: { id: run.id }, data: { status: "SUCCESS", rowCount: pageRows.length, completedAt: new Date() } });
    return { rowCount: pageRows.length };
  } catch (error) {
    await client.trafficSyncRun.update({ where: { id: run.id }, data: { status: "FAILURE", error: (error instanceof Error ? error.message : "未知錯誤").slice(0, 500), completedAt: new Date() } });
    throw error;
  }
}
