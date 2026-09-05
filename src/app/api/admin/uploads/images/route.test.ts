import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getCurrentUser, getSignedUrl } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class {}, PutObjectCommand: class { constructor(public input: unknown) {} } }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl }));

describe("POST /api/admin/uploads/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = "account";
    process.env.CLOUDFLARE_R2_BUCKET = "onewiki-media";
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = "access";
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";
  });

  it("refuses upload URL requests without an authenticated content user", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/admin/uploads/images", { method: "POST", body: JSON.stringify({ name: "image.png", type: "image/png", size: 1_024 }) }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "請先登入" });
  });

  it("returns a short-lived upload URL and an R2 public URL for allowed images", async () => {
    getCurrentUser.mockResolvedValue({ id: "editor", mustChangePassword: false });
    getSignedUrl.mockResolvedValue("https://account.r2.cloudflarestorage.com/signed-upload");

    const response = await POST(new Request("http://localhost/api/admin/uploads/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "image.png", type: "image/png", size: 1_024 }) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ uploadUrl: "https://account.r2.cloudflarestorage.com/signed-upload", publicUrl: expect.stringMatching(/^https:\/\/media\.example\.com\/uploads\//) });
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 300 });
  });
});
