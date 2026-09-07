import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { runDataRetentionCleanup } from "./cleanup";
import { DEFAULT_RETENTION_SETTINGS } from "./settings";
import { cleanupWeChatStaging } from "@/lib/wechat-import/retention";

describe("WeChat import retention", () => {
  beforeEach(resetDatabase);

  it("clears completed source payloads without deleting editor drafts or R2 references", async () => {
    const user = await prisma.user.create({ data: { username: "retention-ready", displayName: "Retention", passwordHash: "test" } });
    const imported = await prisma.weChatImport.create({ data: { userId: user.id, status: "READY", sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", sourceContentHtml: "<p>來源</p>", sourceBlocks: [], editorDraft: { title: "保留草稿" }, expiresAt: new Date("2026-09-08T00:00:00Z"), assets: { create: { position: 0, status: "READY", originalUrl: "https://mmbiz.qpic.cn/a", mimeType: "image/png", byteSize: 3, sha256: "a".repeat(64), alt: "圖", imageBytes: new Uint8Array([1, 2, 3]), objectKey: "wechat-imports/keep.png", publicUrl: "https://images.example/keep.png" } } } });
    await cleanupWeChatStaging(prisma, new Date("2026-09-08T01:00:00Z"));
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id }, include: { assets: true } })).resolves.toMatchObject({ status: "READY", sourceContentHtml: null, sourceBlocks: null, editorDraft: { title: "保留草稿" }, assets: [{ imageBytes: null, objectKey: "wechat-imports/keep.png", publicUrl: "https://images.example/keep.png" }] });
    await expect(cleanupWeChatStaging(prisma, new Date("2026-09-08T01:01:00Z"))).resolves.toBe(0);
  });

  it("expires legacy 24-hour jobs after 30 minutes but preserves fresh and active jobs", async () => {
    const user = await prisma.user.create({ data: { username: "retention-30m", displayName: "Retention", passwordHash: "test" } });
    const now = new Date("2026-09-08T01:00:00Z");
    const create = (status: "FETCHED" | "FETCH_QUEUED" | "REWRITING", createdAt: Date, leaseExpiresAt: Date | null = null) => prisma.weChatImport.create({ data: { userId: user.id, status, sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", sourceContentHtml: "<p>暫存</p>", createdAt, expiresAt: new Date("2026-09-09T00:00:00Z"), leaseExpiresAt } });
    const old = await create("FETCHED", new Date("2026-09-08T00:30:00Z"));
    const queued = await create("FETCH_QUEUED", new Date("2026-09-08T00:00:00Z"));
    const fresh = await create("FETCHED", new Date("2026-09-08T00:30:01Z"));
    const active = await create("REWRITING", new Date("2026-09-08T00:00:00Z"), new Date("2026-09-08T01:01:00Z"));
    await runDataRetentionCleanup(prisma, DEFAULT_RETENTION_SETTINGS, now);
    for (const job of [old, queued]) await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id } })).resolves.toMatchObject({ status: "EXPIRED", sourceContentHtml: null });
    for (const job of [fresh, active]) await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id } })).resolves.toMatchObject({ status: job.status, sourceContentHtml: "<p>暫存</p>" });
  });

  it("scrubs expired staged image bytes and source payloads without deleting audit metadata", async () => {
    const user = await prisma.user.create({ data: { username: "retention-wechat", displayName: "Retention", passwordHash: "test", mustChangePassword: false } });
    const imported = await prisma.weChatImport.create({ data: { userId: user.id, status: "ABANDONED", sourceUrl: "https://mp.weixin.qq.com/s/secret?token=secret", normalizedUrl: "https://mp.weixin.qq.com/s/secret?token=secret", targetLocale: "zh-tw", sourceContentHtml: "<p>暫存</p>", sourceBlocks: [], expiresAt: new Date("2026-09-06T00:00:00Z"), assets: { create: { position: 0, originalUrl: "https://mmbiz.qpic.cn/a?token=secret", mimeType: "image/png", byteSize: 3, sha256: "a".repeat(64), alt: "圖", imageBytes: new Uint8Array([1, 2, 3]) } } } });
    await runDataRetentionCleanup(prisma, DEFAULT_RETENTION_SETTINGS, new Date("2026-09-07T00:00:00Z"));
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id }, include: { assets: true } })).resolves.toMatchObject({ id: imported.id, status: "EXPIRED", sourceContentHtml: null, sourceBlocks: null, assets: [{ imageBytes: null, originalUrl: "" }] });
  });
});
