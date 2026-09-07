import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getWeChatImportForUser } from "@/lib/wechat-import/repository";
import { WeChatImportWorkspace } from "@/components/admin/wechat-import-workspace";
import { parseStoredBlocks, parseRewriteDraft } from "@/lib/wechat-import/schema";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { WECHAT_STAGING_TTL_MS } from "@/lib/wechat-import/retention";
import { normalizeWeChatRewriteDraftForLocale } from "@/lib/wechat-import/rewrite";
import type { ArticleBlock, WeChatRewriteDraft } from "@/lib/wechat-import/types";

function safeBlocks(value: unknown): ArticleBlock[] {
  try { return parseStoredBlocks(value).map((block) => block.type === "text" ? { ...block, html: sanitizeArticleHtml(block.html) } : block); }
  catch { return []; }
}

export default async function WeChatImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) notFound();
  const imported = await getWeChatImportForUser(prisma, id, user.id);
  if (!imported) notFound();
  let rewrittenDraft: WeChatRewriteDraft | null = null;
  try { const draft = normalizeWeChatRewriteDraftForLocale(parseRewriteDraft(imported.rewrittenDraft), imported.targetLocale as "zh-tw" | "en" | "ja"); rewrittenDraft = { ...draft, blocks: safeBlocks(draft.blocks) }; } catch { /* Incomplete jobs have no validated draft. */ }
  const worker = await prisma.workerHeartbeat.findUnique({ where: { id: "wechat-import-worker" }, select: { lastHeartbeat: true, desiredState: true, lastError: true } });
  const report = imported.report && typeof imported.report === "object" && !Array.isArray(imported.report) ? imported.report : {};
  const expiresAt = new Date(Math.min(imported.expiresAt.getTime(), imported.createdAt.getTime() + WECHAT_STAGING_TTL_MS));
  return <WeChatImportWorkspace key={`${imported.id}:${imported.status}`} imported={{
    id: imported.id, status: imported.status, sourceUrl: imported.normalizedUrl, sourceTitle: imported.sourceTitle, sourceAccountName: imported.sourceAccountName, sourceAuthor: imported.sourceAuthor,
    sourcePublishedAt: imported.sourcePublishedAt?.toISOString() || null, sourceContentHtml: imported.sourceContentHtml ? sanitizeArticleHtml(imported.sourceContentHtml) : null, sourceBlocks: safeBlocks(imported.sourceBlocks),
    targetLocale: imported.targetLocale, rewriteMode: imported.rewriteMode, rewriteInstructions: typeof report.rewriteInstructions === "string" ? report.rewriteInstructions : "",
    errorSummary: imported.errorSummary, failureStage: imported.failureStage, expiresAt: expiresAt.toISOString(), updatedAt: imported.updatedAt.toISOString(), serverNow: new Date().toISOString(),
    worker: worker ? { ...worker, lastHeartbeat: worker.lastHeartbeat.toISOString() } : null,
    assets: imported.assets.map((asset) => ({ id: asset.id, status: asset.status, publicUrl: asset.publicUrl, alt: asset.alt, isCover: asset.isCover, byteSize: asset.byteSize })), rewrittenDraft,
  }} />;
}
