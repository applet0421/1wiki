import { Prisma, type PrismaClient } from "@prisma/client";

export const WECHAT_STAGING_TTL_MS = 30 * 60 * 1000;

export async function cleanupWeChatStaging(client: PrismaClient, now = new Date()) {
  const due = { OR: [{ expiresAt: { lte: now } }, { createdAt: { lte: new Date(now.getTime() - WECHAT_STAGING_TTL_MS) } }] };
  return client.$transaction(async (tx) => {
    await tx.weChatImport.updateMany({
      where: { ...due, post: null, AND: [{ OR: [
        { status: { in: ["FETCH_QUEUED", "FETCHED", "REWRITE_QUEUED", "REWRITTEN", "TRANSFER_QUEUED", "FAILED", "UNKNOWN", "TRANSFER_FAILED", "ABANDONED"] } },
        { status: { in: ["FETCHING", "REWRITING", "TRANSFERRING"] }, OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] },
      ] }] },
      data: { status: "EXPIRED", leaseExpiresAt: null },
    });
    const eligible: Prisma.WeChatImportWhereInput = { OR: [
      { status: "EXPIRED", post: null },
      { status: "READY", ...due },
    ] };
    const assets = await tx.weChatImportAsset.updateMany({
      where: { import: { is: eligible }, OR: [{ imageBytes: { not: null } }, { originalUrl: { not: "" } }] },
      data: { imageBytes: null, originalUrl: "" },
    });
    const source = await tx.weChatImport.updateMany({
      where: { AND: [eligible, { OR: [{ sourceContentHtml: { not: null } }, { sourceBlocks: { not: Prisma.DbNull } }, { sourceCoverUrl: { not: null } }] }] },
      data: { sourceCoverUrl: null, sourceContentHtml: null, sourceBlocks: Prisma.DbNull },
    });
    const drafts = await tx.weChatImport.updateMany({
      where: { status: "EXPIRED", post: null, OR: [{ sourceUrl: { not: "https://mp.weixin.qq.com/" } }, { rewrittenDraft: { not: Prisma.DbNull } }, { editorDraft: { not: Prisma.DbNull } }] },
      data: { sourceUrl: "https://mp.weixin.qq.com/", normalizedUrl: "https://mp.weixin.qq.com/", rewrittenDraft: Prisma.DbNull, editorDraft: Prisma.DbNull },
    });
    return assets.count + source.count + drafts.count;
  });
}
