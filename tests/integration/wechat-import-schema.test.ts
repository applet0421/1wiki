import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../helpers/database";

describe("WeChat import schema", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("stores a staged article, ordered assets, and the default retention period", async () => {
    const user = await prisma.user.create({ data: {
      username: "wechat-schema",
      displayName: "Schema",
      passwordHash: "test",
      mustChangePassword: false,
    } });
    const imported = await prisma.weChatImport.create({ data: {
      userId: user.id,
      sourceUrl: "https://mp.weixin.qq.com/s/example",
      normalizedUrl: "https://mp.weixin.qq.com/s/example",
      targetLocale: "zh-tw",
      expiresAt: new Date("2026-09-08T00:00:00.000Z"),
      assets: { create: [{
        position: -1,
        isCover: true,
        originalUrl: "https://mmbiz.qpic.cn/cover",
        mimeType: "image/jpeg",
        byteSize: 3,
        sha256: "a".repeat(64),
        alt: "封面",
        imageBytes: new Uint8Array([1, 2, 3]),
      }] },
    }, include: { assets: true } });

    expect(imported.status).toBe("FETCH_QUEUED");
    expect(imported.rewriteMode).toBe("FAITHFUL");
    expect(imported.assets[0]).toMatchObject({ position: -1, status: "STAGED" });
    const settings = await prisma.dataRetentionSetting.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
    expect(settings.weChatImportHours).toBe(24);
  });
});
