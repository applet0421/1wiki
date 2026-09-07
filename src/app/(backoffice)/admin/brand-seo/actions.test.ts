import { describe, expect, it, vi } from "vitest";

const { getCurrentUser, redirect } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));
import { saveBrandSeoAction } from "./actions";

describe("saveBrandSeoAction", () => {
  it("redirects an unauthenticated user before writing settings", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(saveBrandSeoAction(new FormData())).rejects.toThrow("redirect:/login");
  });
});
