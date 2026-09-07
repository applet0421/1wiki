import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { validateBrandAsset, validateStoredBrandAssets } from "./assets";

async function image(width: number, height: number, format: "png" | "jpeg" = "png") {
  const source = sharp({ create: { width, height, channels: 3, background: "blue" } });
  return format === "png" ? source.png().toBuffer() : source.jpeg().toBuffer();
}

describe("validateBrandAsset", () => {
  it("rejects an icon which is not a square PNG", async () => {
    await expect(validateBrandAsset({ asset: "icon48", bytes: await image(64, 32), declaredType: "image/png" })).rejects.toThrow("圖示必須為正方形 PNG");
    await expect(validateBrandAsset({ asset: "icon48", bytes: await image(64, 64, "jpeg"), declaredType: "image/jpeg" })).rejects.toThrow("圖示必須為正方形 PNG");
  });

  it("rejects a too-small OG image and forged MIME", async () => {
    await expect(validateBrandAsset({ asset: "defaultOg", bytes: await image(599, 315), declaredType: "image/png" })).rejects.toThrow("分享圖至少需要 600×315");
    await expect(validateBrandAsset({ asset: "logo", bytes: await image(64, 64, "jpeg"), declaredType: "image/png" })).rejects.toThrow("檔案類型與實際內容不符");
  });

  it("validates the actual bytes stored for each configured asset", async () => {
    const bytes = await image(64, 64);
    const fetcher = async () => new Response(bytes, { headers: { "content-type": "image/png" } });

    await expect(validateStoredBrandAssets({
      icon48SourceUrl: "https://assets.example/uploads/brand/icon.png",
      logoSourceUrl: null,
      defaultOgSourceUrl: null,
    }, fetcher)).resolves.toBeUndefined();
  });

  it("rejects an unavailable or forged stored asset", async () => {
    const unavailable = async () => new Response(null, { status: 404 });
    await expect(validateStoredBrandAssets({
      icon48SourceUrl: "https://assets.example/uploads/brand/icon.png",
      logoSourceUrl: null,
      defaultOgSourceUrl: null,
    }, unavailable)).rejects.toThrow("品牌圖片無法驗證");
  });
});
