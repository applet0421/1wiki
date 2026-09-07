import type { PrismaClient } from "@prisma/client";
import { normalizeWeChatArticleUrl } from "./url-policy";
import { WECHAT_STAGING_TTL_MS } from "./retention";

const activeStatuses = ["FETCH_QUEUED", "FETCHING", "FETCHED", "REWRITE_QUEUED", "REWRITING", "REWRITTEN", "TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "FAILED", "UNKNOWN"] as const;

export async function createWeChatImport(client: PrismaClient, userId: string, input: { sourceUrl: string; targetLocale: string }, now = new Date()) {
  const normalizedUrl = normalizeWeChatArticleUrl(input.sourceUrl).toString();
  const existing = await client.weChatImport.findFirst({ where: { userId, normalizedUrl, status: { in: [...activeStatuses] }, expiresAt: { gt: now } }, orderBy: { updatedAt: "desc" } });
  if (existing) return { created: false as const, import: existing };
  const imported = await client.weChatImport.create({ data: { userId, sourceUrl: input.sourceUrl.trim(), normalizedUrl, targetLocale: input.targetLocale, expiresAt: new Date(now.getTime() + WECHAT_STAGING_TTL_MS) } });
  return { created: true as const, import: imported };
}

export function getWeChatImportForUser(client: PrismaClient, importId: string, userId: string) {
  return client.weChatImport.findFirst({
    where: { id: importId, userId },
    select: { id: true, status: true, createdAt: true, updatedAt: true, sourceUrl: true, normalizedUrl: true, sourceTitle: true, sourceAccountName: true, sourceAuthor: true, sourcePublishedAt: true, sourceContentHtml: true, sourceBlocks: true, fetchMethod: true, targetLocale: true, rewriteMode: true, rewrittenDraft: true, editorDraft: true, failureStage: true, errorCode: true, errorSummary: true, report: true, expiresAt: true, completedAt: true, assets: { orderBy: { position: "asc" }, select: { id: true, position: true, isCover: true, status: true, mimeType: true, byteSize: true, width: true, height: true, alt: true, publicUrl: true, errorCode: true, errorSummary: true } }, },
    orderBy: { createdAt: "desc" },
  });
}
