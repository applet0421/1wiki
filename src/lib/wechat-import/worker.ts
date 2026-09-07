import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { extractViaBrowser } from "./browser-extractor";
import { extractViaHttp } from "./http-extractor";
import { createReport } from "./report";

const leaseMs = 4 * 60 * 1000;
type Extracted = Awaited<ReturnType<typeof extractViaHttp>> | Awaited<ReturnType<typeof extractViaBrowser>>;
type Dependencies = { extractHttp?: (sourceUrl: string) => Promise<Extracted>; extractBrowser?: (sourceUrl: string) => Promise<Extracted> };

export async function recoverWeChatImportJobs(client: PrismaClient, now = new Date()) {
  await client.weChatImport.updateMany({ where: { status: "FETCHING", leaseExpiresAt: { lt: now } }, data: { status: "FETCH_QUEUED", leaseExpiresAt: null, errorSummary: "擷取工作中斷，已排入安全重試。" } });
}

function sourcePublishedAt(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function processNextWeChatImport(client: PrismaClient, dependencies: Dependencies = {}): Promise<boolean> {
  const job = await client.weChatImport.findFirst({ where: { status: "FETCH_QUEUED" }, orderBy: { createdAt: "asc" } });
  if (!job) return false;
  const lease = new Date(Date.now() + leaseMs);
  const claimed = await client.weChatImport.updateMany({ where: { id: job.id, status: "FETCH_QUEUED" }, data: { status: "FETCHING", leaseExpiresAt: lease, errorCode: null, errorSummary: null } });
  if (!claimed.count) return false;
  try {
    const user = await client.user.findUnique({ where: { id: job.userId }, select: { isActive: true, mustChangePassword: true } });
    if (!user?.isActive || user.mustChangePassword) throw new Error("帳戶目前無法執行擷取。");
    let result = await (dependencies.extractHttp || extractViaHttp)(job.normalizedUrl);
    if (!result.complete) result = await (dependencies.extractBrowser || extractViaBrowser)(job.normalizedUrl);
    if (!result.complete) throw new Error("CONTENT_INCOMPLETE");
    await client.$transaction(async (tx) => {
      await tx.weChatImportAsset.deleteMany({ where: { importId: job.id } });
      const assets = await Promise.all(result.assets.map((asset) => tx.weChatImportAsset.create({ data: { importId: job.id, position: asset.isCover ? -1 : asset.position, isCover: asset.isCover, originalUrl: asset.originalUrl, mimeType: asset.mimeType, byteSize: asset.byteSize, width: asset.width, height: asset.height, sha256: asset.sha256, alt: asset.alt, imageBytes: Uint8Array.from(asset.imageBytes) } })));
      const assetIds = new Map(assets.filter((asset) => !asset.isCover).map((asset) => [asset.position, asset.id]));
      const blocks = result.blocks.map((block) => block.type === "image" ? { ...block, assetId: assetIds.get(Number(block.assetId.slice(-4)) - 1) || block.assetId } : block);
      await tx.weChatImport.update({ where: { id: job.id }, data: {
        status: "FETCHED", sourceTitle: result.article.title, sourceAccountName: result.article.accountName || null, sourceAuthor: result.article.author || null, sourcePublishedAt: sourcePublishedAt(result.article.publishedAt), sourceContentHtml: result.sanitizedHtml, sourceBlocks: blocks as never, sourceContentHash: createHash("sha256").update(result.sanitizedHtml).digest("hex"), fetchMethod: result.fetchMethod, report: createReport("fetch", { status: "success", fetchMethod: result.fetchMethod, title: result.article.title, contentCharacters: result.sanitizedHtml.length, expectedImages: result.assets.length, successfulImages: result.assets.length, failedImages: 0 }) as never, leaseExpiresAt: null, completedAt: new Date(),
      } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "來源擷取失敗";
    const code = /^[A-Z_]+$/u.test(message) ? message : "CONTENT_INCOMPLETE";
    await client.weChatImport.updateMany({ where: { id: job.id, status: "FETCHING" }, data: { status: "FAILED", failureStage: "FETCH", errorCode: code, errorSummary: "無法完成公開文章擷取，請確認連結仍可公開瀏覽後重試。", leaseExpiresAt: null, report: createReport("fetch", { status: "failure" }) as never } });
  }
  return true;
}
