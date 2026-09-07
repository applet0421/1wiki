"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
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

export async function queueWeChatRetryAction(importId: string) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  const job = await prisma.weChatImport.findFirst({ where: { id: importId, userId, expiresAt: { gt: new Date() }, post: null }, select: { status: true, failureStage: true } });
  if (!job) return { ok: false as const, error: "找不到可操作的匯入工作。" };
  const target = job.status === "TRANSFER_FAILED" ? "TRANSFER_QUEUED" : job.status === "FAILED" && job.failureStage === "FETCH" ? "FETCH_QUEUED" : (job.status === "FAILED" || job.status === "UNKNOWN") && job.failureStage === "REWRITE" ? "REWRITE_QUEUED" : null;
  if (!target) return { ok: false as const, error: "此工作目前不可重試。" };
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, status: job.status }, data: { status: target, failureStage: null, errorCode: null, errorSummary: null, leaseExpiresAt: null } });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "工作狀態已變更，請重新整理。" };
}

export async function abandonWeChatImportAction(importId: string) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  const abandoned = await prisma.weChatImport.updateMany({ where: { id: importId, userId, post: null, status: { in: ["FETCH_QUEUED", "FETCHING", "FETCHED", "REWRITE_QUEUED", "REWRITING", "REWRITTEN", "TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "FAILED", "UNKNOWN"] } }, data: { status: "ABANDONED", leaseExpiresAt: null } });
  if (!abandoned.count) return { ok: false as const, error: "找不到可放棄的匯入工作。" };
  await prisma.$transaction([
    prisma.weChatImportAsset.updateMany({ where: { importId }, data: { imageBytes: null, originalUrl: "" } }),
    prisma.weChatImport.update({ where: { id: importId }, data: { sourceUrl: "https://mp.weixin.qq.com/", normalizedUrl: "https://mp.weixin.qq.com/", sourceCoverUrl: null, sourceContentHtml: null, sourceBlocks: Prisma.DbNull, rewrittenDraft: Prisma.DbNull, editorDraft: Prisma.DbNull } }),
  ]);
  return { ok: true as const };
}
