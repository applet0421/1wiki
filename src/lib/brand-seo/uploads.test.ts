import { describe, expect, it } from "vitest";
import { createBrandAssetUpload } from "./uploads";

describe("createBrandAssetUpload", () => {
  it("uses a separate brand key and accepts a PNG icon", () => {
    expect(createBrandAssetUpload({ name: "icon.png", type: "image/png", size: 1_024 }, "icon48", { publicBaseUrl: "https://media.example", now: () => new Date("2026-09-07T00:00:00Z"), randomId: () => "asset" })).toEqual({ key: "uploads/brand/2026/09/asset.png", contentType: "image/png", publicUrl: "https://media.example/uploads/brand/2026/09/asset.png" });
  });

  it("rejects non-PNG icon input", () => {
    expect(() => createBrandAssetUpload({ name: "icon.jpg", type: "image/jpeg", size: 1_024 }, "icon48", { publicBaseUrl: "https://media.example" })).toThrow("圖示僅支援 PNG");
  });
});
