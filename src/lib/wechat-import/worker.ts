import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { AIProviderError } from "@/lib/ai/errors";
import { extractViaBrowser } from "./browser-extractor";
import { extractViaHttp } from "./http-extractor";
import { createReport } from "./report";
import { transferWeChatImportAssets } from "./r2-transfer";
import { rewriteWeChatArticle, WeChatRewriteValidationError } from "./rewrite";
import { parseStoredBlocks } from "./schema";
import { WECHAT_STAGING_TTL_MS } from "./retention";

const leaseMs = 4 * 60 * 1000;
type Extracted = Awaited<ReturnType<typeof extractViaHttp>> | Awaited<ReturnType<typeof extractViaBrowser>>;
type Dependencies = { extractHttp?: (sourceUrl: string) => Promise<Extracted>; extractBrowser?: (sourceUrl: string) => Promise<Extracted>; rewrite?: typeof rewriteWeChatArticle };

export async function recoverWeChatImportJobs(client: PrismaClient, now = new Date()) {
  await client.weChatImport.updateMany({ where: { status: "FETCHING", leaseExpiresAt: { lt: now } }, data: { status: "FETCH_QUEUED", leaseExpiresAt: null, errorSummary: "擷取工作中斷，已排入安全重試。" } });
  await client.weChatImport.updateMany({ where: { status: "REWRITING", leaseExpiresAt: { lt: now } }, data: { status: "UNKNOWN", failureStage: "REWRITE", errorCode: "LLM_RESULT_UNKNOWN", errorSummary: "改寫中斷，費用與結果尚未確認；不會自動重送。", leaseExpiresAt: null } });
}

function sourcePublishedAt(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function processNextWeChatImport(client: PrismaClient, dependencies: Dependencies = {}): Promise<boolean> {
  const now = new Date();
  const job = await client.weChatImport.findFirst({ where: { status: { in: ["FETCH_QUEUED", "REWRITE_QUEUED", "TRANSFER_QUEUED"] }, expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - WECHAT_STAGING_TTL_MS) } }, orderBy: { createdAt: "asc" } });
  if (!job) return false;
  if (job.status === "TRANSFER_QUEUED") {
    await transferWeChatImportAssets(client, job.id);
    return true;
  }
  if (job.status === "REWRITE_QUEUED") {
    const claimedRewrite = await client.weChatImport.updateMany({ where: { id: job.id, status: "REWRITE_QUEUED" }, data: { status: "REWRITING", leaseExpiresAt: new Date(Date.now() + leaseMs) } });
    if (!claimedRewrite.count) return false;
    try {
      const blocks = parseStoredBlocks(job.sourceBlocks);
      const report = job.report && typeof job.report === "object" && !Array.isArray(job.report) ? job.report : {};
      const instructions = typeof report.rewriteInstructions === "string" ? report.rewriteInstructions.slice(0, 2000) : "";
      const draft = await (dependencies.rewrite || rewriteWeChatArticle)({ mode: job.rewriteMode, locale: job.targetLocale as "zh-tw" | "en" | "ja", sourceTitle: job.sourceTitle || "", sourceMetadata: { accountName: job.sourceAccountName, author: job.sourceAuthor, publishedAt: job.sourcePublishedAt?.toISOString() }, blocks, instructions });
      await client.weChatImport.updateMany({ where: { id: job.id, status: "REWRITING" }, data: { status: "REWRITTEN", rewrittenDraft: draft as never, leaseExpiresAt: null, failureStage: null, errorCode: null, errorSummary: null } });
    } catch (error) {
      const errorCode = error instanceof AIProviderError ? `LLM_${error.category.toUpperCase()}` : error instanceof WeChatRewriteValidationError ? "LLM_REWRITE_VALIDATION_FAILED" : "LLM_FAILED";
      const errorSummary = error instanceof AIProviderError
        ? error.category === "output_limit"
          ? "文章完整內容超出目前單次模型輸出上限；請改用支援更長輸出的模型後重試。"
          : error.message
        : error instanceof WeChatRewriteValidationError
          ? `改寫內容未通過結構驗證：${error.message}`
        : "文章改寫未完成，請查看 LLM 用量紀錄並明確重試。";
      await client.weChatImport.updateMany({ where: { id: job.id, status: "REWRITING" }, data: { status: "FAILED", failureStage: "REWRITE", errorCode, errorSummary, leaseExpiresAt: null } });
    }
    return true;
  }
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
      const stillClaimed = await tx.weChatImport.count({ where: { id: job.id, status: "FETCHING" } });
      if (!stillClaimed) throw new Error("IMPORT_ABANDONED");
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
    const errorSummary = code === "SOURCE_VERIFICATION_REQUIRED" ? "來源要求微信驗證；系統不會登入或繞過驗證，因此無法自動擷取。" : code === "SOURCE_LOGIN_REQUIRED" ? "來源要求登入；系統不會登入，因此無法自動擷取。" : "無法完成公開文章擷取，請確認連結仍可公開瀏覽後重試。";
    await client.weChatImport.updateMany({ where: { id: job.id, status: "FETCHING" }, data: { status: "FAILED", failureStage: "FETCH", errorCode: code, errorSummary, leaseExpiresAt: null, report: createReport("fetch", { status: "failure" }) as never } });
  }
  return true;
}
