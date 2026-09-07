import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../../../tests/helpers/database";
import { controlWorkerAction } from "./actions";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ assertOwner: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("worker controls", () => {
  beforeEach(async () => { await resetDatabase(); vi.clearAllMocks(); });

  it("targets the dedicated WeChat import worker", async () => {
    const formData = new FormData();
    formData.set("worker", "wechat-import");
    formData.set("action", "stop");
    await controlWorkerAction(formData);
    await expect(prisma.workerHeartbeat.findUniqueOrThrow({ where: { id: "wechat-import-worker" } })).resolves.toMatchObject({ name: "WeChat import worker", desiredState: "STOPPED" });
  });
});
