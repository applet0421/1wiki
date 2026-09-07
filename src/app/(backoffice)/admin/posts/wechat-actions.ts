"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";
import { createWeChatImport } from "@/lib/wechat-import/repository";
import type { WeChatRewriteMode } from "@/lib/wechat-import/types";

async function currentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user && !user.mustChangePassword ? user.id : null;
}

export async function createWeChatImportAction(input: { sourceUrl: string; targetLocale: string }) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  if (!isLocale(input.targetLocale)) return { ok: false as const, error: "請選擇有效的目標語言。" };
  try {
    const result = await createWeChatImport(prisma, userId, input);
    return { ok: true as const, importId: result.import.id, created: result.created };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "無法建立微信匯入工作。" };
  }
}

export async function queueWeChatRewriteAction(importId: string, mode: WeChatRewriteMode) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  if (mode !== "FAITHFUL" && mode !== "DEEP_SEO") return { ok: false as const, error: "改寫模式無效。" };
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, status: "FETCHED", expiresAt: { gt: new Date() } }, data: { status: "REWRITE_QUEUED", rewriteMode: mode, failureStage: null, errorCode: null, errorSummary: null } });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "找不到可操作的匯入工作。" };
}

export async function queueWeChatTransferAction(importId: string) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, status: "REWRITTEN", expiresAt: { gt: new Date() } }, data: { status: "TRANSFER_QUEUED", failureStage: null, errorCode: null, errorSummary: null } });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "找不到可操作的匯入工作。" };
}
