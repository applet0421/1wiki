import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getWeChatImportForUser } from "@/lib/wechat-import/repository";
import { WeChatImportWorkspace } from "@/components/admin/wechat-import-workspace";

export default async function WeChatImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) notFound();
  const imported = await getWeChatImportForUser(prisma, id, user.id);
  if (!imported) notFound();
  const rewrittenDraft = imported.rewrittenDraft && typeof imported.rewrittenDraft === "object" && !Array.isArray(imported.rewrittenDraft) ? imported.rewrittenDraft as { title?: unknown; excerpt?: unknown; needsVerification?: unknown } : null;
  return <section><p className="eyebrow">微信公眾號改寫</p><h1>匯入與改寫預覽</h1><WeChatImportWorkspace imported={{ id: imported.id, status: imported.status, sourceTitle: imported.sourceTitle, sourceAccountName: imported.sourceAccountName, sourceAuthor: imported.sourceAuthor, sourcePublishedAt: imported.sourcePublishedAt?.toISOString() || null, sourceContentHtml: imported.sourceContentHtml, targetLocale: imported.targetLocale, rewriteMode: imported.rewriteMode, errorSummary: imported.errorSummary, expiresAt: imported.expiresAt.toISOString(), assets: imported.assets.map((asset) => ({ id: asset.id, status: asset.status, publicUrl: asset.publicUrl, alt: asset.alt })), rewrittenDraft }} /></section>;
}
