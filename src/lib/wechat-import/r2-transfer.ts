import type { PrismaClient } from "@prisma/client";
import { uploadGeneratedImage } from "@/lib/media/r2";

const extensionByMime: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

type Dependencies = { upload?: (key: string, bytes: Buffer, mimeType: string) => Promise<string> };

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
      const key = `wechat-imports/${importId}/${asset.id}.${extension}`;
      const publicUrl = await upload(key, Buffer.from(asset.imageBytes), asset.mimeType);
      // This update is deliberately after the remote write: retrying an interrupted upload
      // reuses the deterministic object key, while a confirmed upload immediately frees DB space.
      await client.weChatImportAsset.update({ where: { id: asset.id }, data: { status: "READY", objectKey: key, publicUrl, imageBytes: null, leaseExpiresAt: null, errorCode: null, errorSummary: null } });
    }
    await client.weChatImport.update({ where: { id: importId }, data: { status: "READY", completedAt: new Date(), leaseExpiresAt: null } });
    return true;
  } catch {
    await client.weChatImport.updateMany({ where: { id: importId, status: "TRANSFERRING" }, data: { status: "TRANSFER_FAILED", failureStage: "TRANSFER", errorCode: "R2_UPLOAD_FAILED", errorSummary: "圖片轉存失敗，暫存資料已保留，可重試。", leaseExpiresAt: null } });
    return false;
  }
}
