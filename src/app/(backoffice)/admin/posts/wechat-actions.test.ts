import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../tests/helpers/database";
import { getCurrentUser } from "@/lib/auth/session";
import { abandonWeChatImportAction, createWeChatImportAction, queueWeChatRetryAction, queueWeChatRewriteAction, queueWeChatTransferAction } from "./wechat-actions";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

describe("WeChat import actions", () => {
  beforeEach(async () => { await resetDatabase(); vi.clearAllMocks(); });

  it("atomically saves reviewed fields and an owned cover without replacing content blocks", async () => {
    const user = await prisma.user.create({ data: { username: "wizard-review", displayName: "Owner", passwordHash: "test", mustChangePassword: false } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const draft = { title: "舊標題", excerpt: "摘要", slug: "guide", seoTitle: "SEO", seoDescription: "描述", seoKeywords: "教學", needsVerification: [], blocks: [{ id: "b-0001", type: "text", html: "<p>保留正文</p>" }] };
    const job = await prisma.weChatImport.create({ data: { userId: user.id, sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", status: "REWRITTEN", rewrittenDraft: draft, expiresAt: new Date(Date.now() + 1800000), assets: { create: { position: 0, originalUrl: "https://mmbiz.qpic.cn/a", mimeType: "image/png", byteSize: 3, sha256: "a".repeat(64), imageBytes: new Uint8Array([1,2,3]), alt: "" } } }, include: { assets: true } });
    const review = { title: "新標題", excerpt: "新摘要", slug: "new-guide", seoTitle: "新 SEO", seoDescription: "新描述", seoKeywords: "教學", revision: job.updatedAt.toISOString(), coverAssetId: "not-owned" };
    await expect(queueWeChatTransferAction(job.id, review)).resolves.toMatchObject({ ok: false });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id } })).resolves.toMatchObject({ status: "REWRITTEN", rewrittenDraft: { title: "舊標題" } });
    await expect(queueWeChatTransferAction(job.id, { ...review, coverAssetId: job.assets[0].id })).resolves.toMatchObject({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id }, include: { assets: true } })).resolves.toMatchObject({ status: "TRANSFER_QUEUED", rewrittenDraft: { title: "新標題", blocks: draft.blocks }, assets: [{ isCover: true }] });
    await expect(queueWeChatTransferAction(job.id, { ...review, coverAssetId: job.assets[0].id })).resolves.toMatchObject({ ok: false });
  });

  it("keeps the previous draft when explicitly regenerating with new settings", async () => {
    const user = await prisma.user.create({ data: { username: "wizard-rewrite", displayName: "Owner", passwordHash: "test", mustChangePassword: false } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const job = await prisma.weChatImport.create({ data: { userId: user.id, sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", status: "REWRITTEN", rewrittenDraft: { title: "上一版" }, expiresAt: new Date(Date.now() + 1800000) } });
    await expect(queueWeChatRewriteAction(job.id, "DEEP_SEO", { targetLocale: "ja", instructions: "簡潔" })).resolves.toEqual({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id } })).resolves.toMatchObject({ status: "REWRITE_QUEUED", targetLocale: "ja", rewrittenDraft: { title: "上一版" }, report: { rewriteInstructions: "簡潔" } });
    await expect(queueWeChatRewriteAction(job.id, "FAITHFUL")).resolves.toMatchObject({ ok: false });
  });

  it("rejects legacy imports older than 30 minutes even before cleanup", async () => {
    const user = await prisma.user.create({ data: { username: "wizard-expired", displayName: "Owner", passwordHash: "test", mustChangePassword: false } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const job = await prisma.weChatImport.create({ data: { userId: user.id, sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", status: "FETCHED", createdAt: new Date(Date.now() - 1800001), expiresAt: new Date(Date.now() + 86400000) } });
    await expect(queueWeChatRewriteAction(job.id, "FAITHFUL")).resolves.toMatchObject({ ok: false });
  });

  it("creates an owned import and only advances its permitted states", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-action", displayName: "Action", passwordHash: "test", mustChangePassword: false } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);

    const created = await createWeChatImportAction({ sourceUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "en" });
    expect(created).toMatchObject({ ok: true, created: true });
    if (!created.ok) throw new Error(created.error);
    await prisma.weChatImport.update({ where: { id: created.importId }, data: { status: "FETCHED", sourceBlocks: [{ id: "b-0001", type: "text", html: "<p>內容</p>" }] } });

    await expect(queueWeChatRewriteAction(created.importId, "DEEP_SEO")).resolves.toEqual({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: created.importId } })).resolves.toMatchObject({ status: "REWRITE_QUEUED", rewriteMode: "DEEP_SEO" });
    await prisma.weChatImport.update({ where: { id: created.importId }, data: { status: "REWRITTEN" } });
    await expect(queueWeChatTransferAction(created.importId)).resolves.toEqual({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: created.importId } })).resolves.toMatchObject({ status: "TRANSFER_QUEUED" });
  });

  it("does not let a different user queue an import", async () => {
    const [owner, other] = await Promise.all([
      prisma.user.create({ data: { username: "wechat-owner", displayName: "Owner", passwordHash: "test", mustChangePassword: false } }),
      prisma.user.create({ data: { username: "wechat-other", displayName: "Other", passwordHash: "test", mustChangePassword: false } }),
    ]);
    const imported = await prisma.weChatImport.create({ data: { userId: owner.id, status: "FETCHED", sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", sourceBlocks: [{ id: "b-0001", type: "text", html: "<p>內容</p>" }], expiresAt: new Date("2026-09-08T00:00:00Z") } });
    vi.mocked(getCurrentUser).mockResolvedValue(other);

    await expect(queueWeChatRewriteAction(imported.id, "FAITHFUL")).resolves.toEqual({ ok: false, error: "找不到可操作的匯入工作。" });
  });

  it("retries only the failed stage and immediately scrubs an abandoned payload", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-retry", displayName: "Retry", passwordHash: "test", mustChangePassword: false } });
    vi.mocked(getCurrentUser).mockResolvedValue(user);
    const imported = await prisma.weChatImport.create({ data: { userId: user.id, status: "TRANSFER_FAILED", sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", sourceContentHtml: "<p>敏感來源</p>", expiresAt: new Date("2026-09-08T00:00:00Z"), assets: { create: { position: 0, originalUrl: "https://mmbiz.qpic.cn/a", mimeType: "image/png", byteSize: 3, sha256: "b".repeat(64), alt: "圖", imageBytes: new Uint8Array([1, 2, 3]) } } } });
    await expect(queueWeChatRetryAction(imported.id)).resolves.toEqual({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id } })).resolves.toMatchObject({ status: "TRANSFER_QUEUED" });
    await expect(abandonWeChatImportAction(imported.id)).resolves.toEqual({ ok: true });
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id }, include: { assets: true } })).resolves.toMatchObject({ status: "ABANDONED", sourceContentHtml: null, assets: [{ imageBytes: null, originalUrl: "" }] });
  });
});
