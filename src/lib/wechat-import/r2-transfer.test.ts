import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { transferWeChatImportAssets } from "./r2-transfer";

describe("WeChat R2 transfer", () => {
  beforeEach(resetDatabase);

  it("uploads staged assets then immediately removes their database bytes", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-r2", displayName: "R2", passwordHash: "test", mustChangePassword: false } });
    const imported = await prisma.weChatImport.create({ data: { userId: user.id, status: "TRANSFER_QUEUED", sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", sourceBlocks: [{ id: "b-0001", type: "text", html: "<p>來源段落</p>" }], rewrittenDraft: { title: "改寫標題", slug: "rewritten-title", excerpt: "摘要", seoTitle: "改寫標題", seoDescription: "摘要", seoKeywords: "關鍵字", needsVerification: [], blocks: [{ id: "b-0001", type: "text", html: "<p>改寫段落</p>" }] }, expiresAt: new Date("2026-09-08T00:00:00Z"), assets: { create: { position: 0, originalUrl: "https://mmbiz.qpic.cn/a", mimeType: "image/png", byteSize: 3, sha256: "a".repeat(64), alt: "圖", imageBytes: new Uint8Array([1, 2, 3]) } } } });
    const upload = vi.fn(async (key: string) => `https://images.example.com/${key}`);
    await expect(transferWeChatImportAssets(prisma, imported.id, { upload })).resolves.toBe(true);
    expect(upload).toHaveBeenCalledWith(expect.stringContaining(`wechat-imports/${imported.id}/`), expect.any(Buffer), "image/png");
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id }, include: { assets: true } })).resolves.toMatchObject({ status: "READY", editorDraft: expect.objectContaining({ sourceImportId: imported.id, title: "改寫標題", contentHtml: "<p>改寫段落</p>" }), assets: [{ status: "READY", imageBytes: null, publicUrl: expect.stringContaining("https://images.example.com/") }] });
  });
});
