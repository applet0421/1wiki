import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { createWeChatImport } from "./repository";
import { processNextWeChatImport } from "./worker";
import * as transfer from "./r2-transfer";

describe("WeChat import worker", () => {
  beforeEach(resetDatabase);

  it("claims one queued job and persists a completed HTTP extraction", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-worker", displayName: "Worker", passwordHash: "test", mustChangePassword: false } });
    const job = (await createWeChatImport(prisma, user.id, { sourceUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw" })).import;
    const extractHttp = vi.fn(async () => ({ fetchMethod: "HTTP" as const, complete: true, article: { sourceUrl: new URL("https://mp.weixin.qq.com/s/example"), title: "標題", accountName: "帳號", author: "作者", publishedAt: "2026-09-07", contentHtml: "<p>內文</p>" }, sanitizedHtml: "<p>內文</p>", blocks: [{ id: "b-0001", type: "text" as const, html: "<p>內文</p>" }], imageRequests: [], warnings: [], assets: [], assetFailures: [] }));
    await expect(processNextWeChatImport(prisma, { extractHttp })).resolves.toBe(true);
    expect(extractHttp).toHaveBeenCalledWith(job.normalizedUrl);
    await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: job.id } })).resolves.toMatchObject({ status: "FETCHED", sourceTitle: "標題", fetchMethod: "HTTP" });
  });

  it("hands a confirmed rewrite to the R2 transfer stage", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-transfer-worker", displayName: "Transfer", passwordHash: "test", mustChangePassword: false } });
    const job = await prisma.weChatImport.create({ data: { userId: user.id, status: "TRANSFER_QUEUED", sourceUrl: "https://mp.weixin.qq.com/s/example", normalizedUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw", expiresAt: new Date("2026-09-08T00:00:00Z") } });
    const transferSpy = vi.spyOn(transfer, "transferWeChatImportAssets").mockResolvedValue(true);
    await expect(processNextWeChatImport(prisma)).resolves.toBe(true);
    expect(transferSpy).toHaveBeenCalledWith(prisma, job.id);
  });
});
