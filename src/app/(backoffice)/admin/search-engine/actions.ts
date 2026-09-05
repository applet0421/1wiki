"use server";
import { redirect } from "next/navigation";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { submitIndexNow } from "@/lib/search-engine/notifications";

export async function processSearchEngineAction() {
  assertOwner(await getCurrentUser());
  const rows = await prisma.searchEngineNotification.findMany({ where: { engine: "bing", status: "PENDING" }, take: 100, orderBy: { createdAt: "asc" } });
  try {
    const result = await submitIndexNow(rows.map((row) => row.url));
    if (!result.skipped && rows.length) await prisma.searchEngineNotification.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { status: "SUCCESS", sentAt: new Date(), attempts: { increment: 1 } } });
    redirect(`/admin/search-engine?success=${result.skipped ? "skipped" : "processed"}`);
  } catch (error) { redirect(`/admin/search-engine?error=${encodeURIComponent(error instanceof Error ? error.message : "同步失敗")}`); }
}
