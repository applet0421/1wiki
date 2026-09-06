import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, updateMany, revalidatePath, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateMany: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { publicInvalidation: { updateMany } } }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

import { retryPublicInvalidationsAction } from "./actions";

describe("cache actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ role: "OWNER", isActive: true });
  });

  it("requeues failed public invalidations for the cache worker", async () => {
    await expect(retryPublicInvalidationsAction()).rejects.toThrow("redirect:/admin/cache?success=retried");
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "FAILED" },
      data: expect.objectContaining({ status: "PENDING", lastError: null }),
    }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/cache");
  });
});
