import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));

import { imageApiUser } from "./image-api";

describe("image API origin protection", () => {
  beforeEach(() => {
    getCurrentUser.mockResolvedValue({ id: "owner", role: "OWNER", mustChangePassword: false });
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.1wiki.org";
  });

  it("allows the configured public origin when the proxy request URL is internal", async () => {
    const result = await imageApiUser(new Request("http://web:3000/api/admin/ai-images/plan", {
      method: "POST",
      headers: { origin: "https://www.1wiki.org" },
    }));

    expect(result).toMatchObject({ id: "owner" });
  });

  it("rejects an unrelated public origin", async () => {
    const result = await imageApiUser(new Request("http://web:3000/api/admin/ai-images/plan", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });
});
