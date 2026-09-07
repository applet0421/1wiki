import type { PrismaClient } from "@prisma/client";
import { uploadGeneratedImage } from "@/lib/media/r2";
import { parseRewriteDraft } from "./schema";
import type { ArticleBlock, WeChatEditorDraft } from "./types";

const extensionByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

type Dependencies = { upload?: (key: string, bytes: Buffer, mimeType: string) => Promise<string> };

function escapeAttribute(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;");
}

function buildContentHtml(blocks: ArticleBlock[], publicUrls: Map<string, string>): string {
  return blocks.map((block) => {
    if (block.type === "text") return block.html;
    const url = publicUrls.get(block.assetId);
    if (!url) throw new Error("改寫草稿引用的圖片未完成轉存。");
    return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(block.alt)}">`;
  }).join("\n");
}

export async function transferWeChatImportAssets(client: PrismaClient, importId: string, dependencies: Dependencies = {}): Promise<boolean> {
  const claimed = await client.weChatImport.updateMany({ where: { id: importId, status: "TRANSFER_QUEUED" }, data: { status: "TRANSFERRING", leaseExpiresAt: new Date(Date.now() + 4 * 60 * 1000), errorCode: null, errorSummary: null } });
  if (!claimed.count) return false;
  const upload = dependencies.upload || uploadGeneratedImage;
  try {
    const assets = await client.weChatImportAsset.findMany({ where: { importId, status: { not: "READY" } }, orderBy: { position: "asc" } });
    for (const asset of assets) {
      if (!asset.imageBytes) throw new Error("圖片暫存資料不存在，請重新擷取。");
      const extension = extensionByMime[asset.mimeType];
      if (!extension) throw new Error("圖片格式不被支援。");
      const key = `wechat-imports/${importId}/${asset.sha256.slice(0, 16)}-${asset.id}.${extension}`;
      const publicUrl = await upload(key, Buffer.from(asset.imageBytes), asset.mimeType);
      // This update is deliberately after the remote write: retrying an interrupted upload
      // reuses the deterministic object key, while a confirmed upload immediately frees DB space.
      await client.weChatImportAsset.update({ where: { id: asset.id }, data: { status: "READY", objectKey: key, publicUrl, imageBytes: null, leaseExpiresAt: null, errorCode: null, errorSummary: null } });
    }
    const [imported, readyAssets] = await Promise.all([
      client.weChatImport.findUniqueOrThrow({ where: { id: importId }, select: { rewrittenDraft: true } }),
      client.weChatImportAsset.findMany({ where: { importId, status: "READY" }, select: { id: true, isCover: true, publicUrl: true } }),
    ]);
    const rewritten = parseRewriteDraft(imported.rewrittenDraft);
    const publicUrls = new Map(readyAssets.flatMap((asset) => asset.publicUrl ? [[asset.id, asset.publicUrl] as const] : []));
    const coverImage = readyAssets.find((asset) => asset.isCover)?.publicUrl || "";
    const editorDraft: WeChatEditorDraft = { ...rewritten, sourceImportId: importId, coverImage, contentHtml: buildContentHtml(rewritten.blocks, publicUrls) };
    await client.weChatImport.update({ where: { id: importId }, data: { status: "READY", editorDraft, completedAt: new Date(), leaseExpiresAt: null } });
    return true;
  } catch {
    await client.weChatImport.updateMany({ where: { id: importId, status: "TRANSFERRING" }, data: { status: "TRANSFER_FAILED", failureStage: "TRANSFER", errorCode: "R2_UPLOAD_FAILED", errorSummary: "圖片轉存失敗，暫存資料已保留，可重試。", leaseExpiresAt: null } });
    return false;
  }
}
