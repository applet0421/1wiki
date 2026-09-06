"use server";
import { redirect } from "next/navigation";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { submitGoogleSitemap, submitIndexNow } from "@/lib/search-engine/notifications";

export async function processSearchEngineAction() {
  assertOwner(await getCurrentUser());
  const rows = await prisma.searchEngineNotification.findMany({ where: { status: "PENDING" }, take: 100, orderBy: { createdAt: "asc" } });
  const bingRows = rows.filter((row) => row.engine === "bing");
  const googleRows = rows.filter((row) => row.engine === "google");
  try {
    const result = await submitIndexNow(bingRows.map((row) => row.url));
    if (!result.skipped && bingRows.length) await prisma.searchEngineNotification.updateMany({ where: { id: { in: bingRows.map((row) => row.id) } }, data: { status: "SUCCESS", sentAt: new Date(), attempts: { increment: 1 } } });
    const googleResult = await submitGoogleSitemap();
    if (!googleResult.skipped && googleRows.length) await prisma.searchEngineNotification.updateMany({ where: { id: { in: googleRows.map((row) => row.id) } }, data: { status: "SUCCESS", sentAt: new Date(), attempts: { increment: 1 } } });
    redirect(`/admin/search-engine?success=${result.skipped ? "skipped" : "processed"}`);
  } catch (error) { redirect(`/admin/search-engine?error=${encodeURIComponent(error instanceof Error ? error.message : "同步失敗")}`); }
}
