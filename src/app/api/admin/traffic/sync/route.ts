import { getCurrentUser } from "@/lib/auth/session";
import { syncGa4Traffic } from "@/lib/analytics/ga4-sync";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const authorizedCron = process.env.GA4_SYNC_SECRET && request.headers.get("authorization") === `Bearer ${process.env.GA4_SYNC_SECRET}`;
  if ((!user || user.role !== "OWNER") && !authorizedCron) return Response.json({ error: "未授權" }, { status: 401 });
  const to = new Date(); const from = new Date("2020-01-01T00:00:00.000Z");
  try { await syncGa4Traffic(prisma, from, to); return Response.redirect(new URL("/admin/traffic?success=synced", request.url), 303); }
  catch (error) { return Response.redirect(new URL(`/admin/traffic?error=${encodeURIComponent(error instanceof Error ? error.message : "同步失敗")}`, request.url), 303); }
}
