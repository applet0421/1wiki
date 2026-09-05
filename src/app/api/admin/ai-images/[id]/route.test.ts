import { expect, it, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { imageGeneration: { findFirst: vi.fn() } } }));
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { GET, POST } from "./route";
const context = { params: Promise.resolve({ id: "job1" }) };
it("rejects unauthenticated reads and cross-origin writes before accessing jobs", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  expect((await GET(new Request("https://wiki.test/api/admin/ai-images/job1"), context)).status).toBe(401);
  expect((await POST(new Request("https://wiki.test/api/admin/ai-images/job1", { method: "POST", headers: { origin: "https://evil.test" } }), context)).status).toBe(403);
  expect(prisma.imageGeneration.findFirst).not.toHaveBeenCalled();
});
it("does not disclose another user's task", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1", mustChangePassword: false } as Awaited<ReturnType<typeof getCurrentUser>>);
  vi.mocked(prisma.imageGeneration.findFirst).mockResolvedValue(null);
  const response = await GET(new Request("https://wiki.test/api/admin/ai-images/job1"), context);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "找不到配圖任務" });
  expect(prisma.imageGeneration.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "job1", userId: "user1" } }));
});
