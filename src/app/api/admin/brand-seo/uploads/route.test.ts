import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getCurrentUser, getSignedUrl } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getSignedUrl: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class {}, PutObjectCommand: class { constructor(public input: unknown) {} } }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl }));

const request = () => new Request("http://localhost/api/admin/brand-seo/uploads", { method: "POST", body: JSON.stringify({ asset: "icon48", file: { name: "icon.png", type: "image/png", size: 1024 } }) });

describe("POST /api/admin/brand-seo/uploads", () => {
  beforeEach(() => { vi.clearAllMocks(); Object.assign(process.env, { CLOUDFLARE_R2_ACCOUNT_ID: "account", CLOUDFLARE_R2_BUCKET: "bucket", CLOUDFLARE_R2_ACCESS_KEY_ID: "key", CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret", R2_PUBLIC_BASE_URL: "https://media.example" }); });
  it("allows only an active OWNER", async () => {
    getCurrentUser.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
    getCurrentUser.mockResolvedValue({ role: "EDITOR", isActive: true, mustChangePassword: false }); expect((await POST(request())).status).toBe(403);
    getCurrentUser.mockResolvedValue({ role: "OWNER", isActive: true, mustChangePassword: false }); getSignedUrl.mockResolvedValue("https://signed.example");
    await expect((await POST(request())).json()).resolves.toMatchObject({ asset: "icon48", uploadUrl: "https://signed.example", publicUrl: expect.stringMatching(/^https:\/\/media\.example\/uploads\/brand\//) });
  });
});
