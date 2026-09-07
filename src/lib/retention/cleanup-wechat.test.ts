import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { runDataRetentionCleanup } from "./cleanup";
import { DEFAULT_RETENTION_SETTINGS } from "./settings";

describe("WeChat import retention", () => {
  beforeEach(resetDatabase);

  it("scrubs expired staged image bytes and source payloads without deleting audit metadata", async () => {
    const user = await prisma.user.create({ data: { username: "retention-wechat", displayName: "Retention", passwordHash: "test", mustChangePassword: false } });
    const imported = await prisma.weChatImport.create({ data: { userId: user.id, status: "ABANDONED", sourceUrl: "https://mp.weixin.qq.com/s/secret?token=secret", normalizedUrl: "https://mp.weixin.qq.com/s/secret?token=secret", targetLocale: "zh-tw", sourceContentHtml: "<p>暫存</p>", sourceBlocks: [], expiresAt: new Date("2026-09-06T00:00:00Z"), assets: { create: { position: 0, originalUrl: "https://mmbiz.qpic.cn/a?token=secret", mimeType: "image/png", byteSize: 3, sha256: "a".repeat(64), alt: "圖", imageBytes: new Uint8Array([1, 2, 3]) } } } });
    await runDataRetentionCleanup(prisma, DEFAULT_RETENTION_SETTINGS, new Date("2026-09-07T00:00:00Z"));
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id }, include: { assets: true } })).resolves.toMatchObject({ id: imported.id, status: "EXPIRED", sourceContentHtml: null, sourceBlocks: null, assets: [{ imageBytes: null, originalUrl: "" }] });
  });
});
