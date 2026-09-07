import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { createWeChatImport, getWeChatImportForUser } from "./repository";

describe("WeChat import repository", () => {
  beforeEach(resetDatabase);

  it("creates a durable, user-owned fetch job and reuses an active duplicate", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-owner", displayName: "Owner", passwordHash: "test", mustChangePassword: false } });
    const first = await createWeChatImport(prisma, user.id, { sourceUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw" }, new Date("2026-09-07T00:00:00Z"));
    const second = await createWeChatImport(prisma, user.id, { sourceUrl: "https://mp.weixin.qq.com/s/example", targetLocale: "zh-tw" }, new Date("2026-09-07T00:10:00Z"));
    expect(first.import.expiresAt).toEqual(new Date("2026-09-07T00:30:00Z"));
    expect(first.created).toBe(true);
    expect(second).toMatchObject({ created: false, import: { id: first.import.id } });
    await expect(getWeChatImportForUser(prisma, first.import.id, user.id)).resolves.toMatchObject({ id: first.import.id, status: "FETCH_QUEUED" });
  });
});
