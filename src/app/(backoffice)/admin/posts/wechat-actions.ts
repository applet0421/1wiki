"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { isLocale } from "@/lib/i18n/config";
import { createWeChatImport } from "@/lib/wechat-import/repository";
import type { WeChatImportStatus, WeChatRewriteMode } from "@/lib/wechat-import/types";
import { WECHAT_STAGING_TTL_MS } from "@/lib/wechat-import/retention";
import { parseRewriteDraft } from "@/lib/wechat-import/schema";
import { normalizeWeChatRewriteDraftForLocale } from "@/lib/wechat-import/rewrite";
import { z } from "zod";

function liveWindow(now = new Date()) { return { expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - WECHAT_STAGING_TTL_MS) } }; }
const rewriteSettingsSchema = z.object({ targetLocale: z.enum(["zh-tw", "en", "ja"]), instructions: z.string().trim().max(2000) }).strict();
const reviewSchema = z.object({ title: z.string(), excerpt: z.string(), slug: z.string(), seoTitle: z.string(), seoDescription: z.string(), seoKeywords: z.string(), coverAssetId: z.string().max(128), revision: z.string().datetime() }).strict();

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

export async function queueWeChatRewriteAction(importId: string, mode: WeChatRewriteMode, settings?: { targetLocale: string; instructions: string }) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  if (mode !== "FAITHFUL" && mode !== "DEEP_SEO") return { ok: false as const, error: "改寫模式無效。" };
  const parsed = settings === undefined ? null : rewriteSettingsSchema.safeParse(settings);
  if (parsed && !parsed.success) return { ok: false as const, error: "請確認目標語言，補充要求不可超過 2000 字。" };
  const job = await prisma.weChatImport.findFirst({ where: { id: importId, userId, post: null, status: { in: ["FETCHED", "REWRITTEN"] }, ...liveWindow() }, select: { report: true, status: true, updatedAt: true } });
  if (!job) return { ok: false as const, error: "找不到可操作的匯入工作。" };
  const report = job.report && typeof job.report === "object" && !Array.isArray(job.report) ? job.report : {};
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, status: job.status, updatedAt: job.updatedAt, ...liveWindow() }, data: { status: "REWRITE_QUEUED", rewriteMode: mode, ...(parsed?.success ? { targetLocale: parsed.data.targetLocale, report: { ...report, rewriteInstructions: parsed.data.instructions } } : {}), failureStage: null, errorCode: null, errorSummary: null } });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "找不到可操作的匯入工作。" };
}

export async function queueWeChatTransferAction(importId: string, review?: z.infer<typeof reviewSchema>) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  if (review !== undefined) {
    const parsed = reviewSchema.safeParse(review);
    if (!parsed.success) return { ok: false as const, error: "審閱欄位格式不正確，請重新確認。" };
    try {
      await prisma.$transaction(async (tx) => {
        const job = await tx.weChatImport.findFirst({ where: { id: importId, userId, post: null, status: "REWRITTEN", updatedAt: new Date(parsed.data.revision), ...liveWindow() }, select: { rewrittenDraft: true, updatedAt: true, targetLocale: true } });
        if (!job) throw new Error("STALE");
        const { coverAssetId, title, excerpt, slug, seoTitle, seoDescription, seoKeywords } = parsed.data;
        const fields = { title, excerpt, slug, seoTitle, seoDescription, seoKeywords };
        const draft = normalizeWeChatRewriteDraftForLocale(parseRewriteDraft({ ...parseRewriteDraft(job.rewrittenDraft), ...fields }), job.targetLocale as "zh-tw" | "en" | "ja");
        if (coverAssetId && !await tx.weChatImportAsset.count({ where: { id: coverAssetId, importId, status: { in: ["STAGED", "READY"] } } })) throw new Error("COVER");
        const updated = await tx.weChatImport.updateMany({ where: { id: importId, userId, status: "REWRITTEN", updatedAt: job.updatedAt, ...liveWindow() }, data: { status: "TRANSFER_QUEUED", rewrittenDraft: draft as never, failureStage: null, errorCode: null, errorSummary: null } });
        if (!updated.count) throw new Error("STALE");
        await tx.weChatImportAsset.updateMany({ where: { importId }, data: { isCover: false } });
        if (coverAssetId) await tx.weChatImportAsset.updateMany({ where: { importId, id: coverAssetId }, data: { isCover: true } });
      });
      return { ok: true as const };
    } catch { return { ok: false as const, error: "草稿已變更、已到期，或欄位／封面無效；請重新整理後確認。" }; }
  }
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, post: null, status: "REWRITTEN", ...liveWindow() }, data: { status: "TRANSFER_QUEUED", failureStage: null, errorCode: null, errorSummary: null } });
  return updated.count ? { ok: true as const } : { ok: false as const, error: "找不到可操作的匯入工作。" };
}

export async function queueWeChatRetryAction(importId: string) {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  const job = await prisma.weChatImport.findFirst({ where: { id: importId, userId, ...liveWindow(), post: null }, select: { status: true, failureStage: true } });
  if (!job) return { ok: false as const, error: "找不到可操作的匯入工作。" };
  const target = job.status === "TRANSFER_FAILED" ? "TRANSFER_QUEUED" : job.status === "FAILED" && job.failureStage === "FETCH" ? "FETCH_QUEUED" : (job.status === "FAILED" || job.status === "UNKNOWN") && job.failureStage === "REWRITE" ? "REWRITE_QUEUED" : null;
  if (!target) return { ok: false as const, error: "此工作目前不可重試。" };
  const updated = await prisma.weChatImport.updateMany({ where: { id: importId, userId, status: job.status, ...liveWindow() }, data: { status: target, failureStage: null, errorCode: null, errorSummary: null, leaseExpiresAt: null } });
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

const resettableWeChatImportStatuses: WeChatImportStatus[] = ["FETCH_QUEUED", "FETCHING", "FETCHED", "REWRITE_QUEUED", "REWRITING", "REWRITTEN", "TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "FAILED", "UNKNOWN"];

export async function resetAllWeChatImportsAction() {
  const userId = await currentUserId();
  if (!userId) return { ok: false as const, error: "請先登入後台。" };
  const cleared = await prisma.$transaction(async (tx) => {
    const candidates = await tx.weChatImport.findMany({
      where: { userId, post: null, status: { in: resettableWeChatImportStatuses } },
      select: { id: true },
    });
    if (!candidates.length) return 0;
    const candidateIds = candidates.map((item) => item.id);
    await tx.weChatImport.updateMany({
      where: { id: { in: candidateIds }, userId, post: null, status: { in: resettableWeChatImportStatuses } },
      data: { status: "ABANDONED", leaseExpiresAt: null },
    });
    const targetIds = (await tx.weChatImport.findMany({ where: { id: { in: candidateIds }, userId, post: null, status: "ABANDONED" }, select: { id: true } })).map((item) => item.id);
    if (!targetIds.length) return 0;
    await tx.weChatImportAsset.updateMany({ where: { importId: { in: targetIds } }, data: { imageBytes: null, originalUrl: "" } });
    await tx.weChatImport.updateMany({
      where: { id: { in: targetIds } },
      data: { sourceUrl: "https://mp.weixin.qq.com/", normalizedUrl: "https://mp.weixin.qq.com/", sourceCoverUrl: null, sourceContentHtml: null, sourceBlocks: Prisma.DbNull, rewrittenDraft: Prisma.DbNull, editorDraft: Prisma.DbNull },
    });
    return targetIds.length;
  });
  return { ok: true as const, cleared };
}
