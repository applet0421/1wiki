import { describe, expect, it, vi } from "vitest";
const { getBrandAssetSource } = vi.hoisted(() => ({ getBrandAssetSource: vi.fn() }));
vi.mock("@/lib/brand-seo/repository", () => ({ getBrandAssetSource }));
import { GET } from "./route";

describe("GET /brand/[asset]", () => {
  it("redirects a missing configured icon to the current static fallback", async () => {
    getBrandAssetSource.mockResolvedValue(null);
    const response = await GET(new Request("https://1wiki.org/brand/icon-48.png"), { params: Promise.resolve({ asset: "icon-48.png" }) });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://1wiki.org/icon-48.png");
  });

  it("returns 404 for a non-brand asset path", async () => {
    const response = await GET(new Request("https://1wiki.org/brand/unknown"), { params: Promise.resolve({ asset: "unknown" }) });
    expect(response.status).toBe(404);
  });
});
