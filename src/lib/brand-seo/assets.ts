import sharp from "sharp";

export type BrandAssetKind = "icon48" | "logo" | "defaultOg";

const allowedTypes: Record<BrandAssetKind, readonly string[]> = {
  icon48: ["image/png"],
  logo: ["image/jpeg", "image/png", "image/webp"],
  defaultOg: ["image/jpeg", "image/png", "image/webp"],
};

function actualMime(format: string | undefined): string | null {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return null;
}

export async function validateBrandAsset(input: { asset: BrandAssetKind; bytes: Buffer; declaredType: string }) {
  if (input.bytes.length === 0 || input.bytes.length > 10 * 1024 * 1024) throw new Error("圖片不可超過 10 MB");
  let metadata;
  try { metadata = await sharp(input.bytes, { failOn: "error", limitInputPixels: 40_000_000 }).metadata(); } catch { throw new Error("圖片無法讀取"); }
  const mime = actualMime(metadata.format);
  if (!mime || mime !== input.declaredType) throw new Error("檔案類型與實際內容不符");
  if (!allowedTypes[input.asset].includes(mime)) throw new Error(input.asset === "icon48" ? "圖示必須為正方形 PNG" : "不支援此圖片格式");
  if (input.asset === "icon48" && (!metadata.width || !metadata.height || metadata.width !== metadata.height)) throw new Error("圖示必須為正方形 PNG");
  if (input.asset === "defaultOg" && (!metadata.width || !metadata.height || metadata.width < 600 || metadata.height < 315)) throw new Error("分享圖至少需要 600×315");
  return { mimeType: mime, width: metadata.width!, height: metadata.height! };
}
