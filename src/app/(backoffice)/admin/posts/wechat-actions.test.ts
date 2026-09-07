import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../tests/helpers/database";
import { getCurrentUser } from "@/lib/auth/session";
import { abandonWeChatImportAction, createWeChatImportAction, queueWeChatRetryAction, queueWeChatRewriteAction, queueWeChatTransferAction } from "./wechat-actions";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

describe("WeChat import actions", () => {
  beforeEach(async () => { await resetDatabase(); vi.clearAllMocks(); });

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
