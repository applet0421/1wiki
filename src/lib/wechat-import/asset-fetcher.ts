import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { assertAllowedWeChatImageUrl, safeHttpsGet } from "./url-policy";

export type AssetRequest = { position: number; isCover: boolean; url: string; alt: string };
export type StagedAsset = AssetRequest & { originalUrl: string; mimeType: string; byteSize: number; width: number | null; height: number | null; sha256: string; imageBytes: Buffer };
export type AssetFailure = { position: number; isCover: boolean; code: "ASSET_DOWNLOAD_FAILED" | "ASSET_TYPE_INVALID" | "ASSET_DECODE_FAILED" | "ASSET_LIMIT_EXCEEDED"; detail: string };

const MAX_SINGLE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_ASSETS = 101;

function mimeFromMagic(bytes: Buffer): string | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function fetchWeChatAssets(requests: AssetRequest[], options: { request?: typeof safeHttpsGet } = {}): Promise<{ assets: StagedAsset[]; failures: AssetFailure[]; complete: boolean }> {
  if (requests.length > MAX_ASSETS) return { assets: [], failures: [{ position: -1, isCover: false, code: "ASSET_LIMIT_EXCEEDED", detail: "圖片數量超過上限" }], complete: false };
  const request = options.request || ((url: string | URL) => safeHttpsGet(url, { maxBytes: MAX_SINGLE_BYTES, validateUrl: (candidate) => assertAllowedWeChatImageUrl(candidate) }));
  const assets: StagedAsset[] = [];
  const failures: AssetFailure[] = [];
  let totalBytes = 0;

  for (const item of requests) {
    try {
      const response = await request(assertAllowedWeChatImageUrl(item.url));
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      if (response.body.length > MAX_SINGLE_BYTES || totalBytes + response.body.length > MAX_TOTAL_BYTES) {
        failures.push({ position: item.position, isCover: item.isCover, code: "ASSET_LIMIT_EXCEEDED", detail: "圖片大小超過上限" });
        continue;
      }
      const mimeType = mimeFromMagic(response.body);
      if (!mimeType) {
        failures.push({ position: item.position, isCover: item.isCover, code: "ASSET_TYPE_INVALID", detail: "圖片格式不被支援" });
        continue;
      }
      let metadata: Metadata;
      try { metadata = await sharp(response.body, { limitInputPixels: 40_000_000, animated: true, failOn: "error" }).metadata(); }
      catch { failures.push({ position: item.position, isCover: item.isCover, code: "ASSET_DECODE_FAILED", detail: "圖片無法解碼" }); continue; }
      totalBytes += response.body.length;
      assets.push({ ...item, originalUrl: response.finalUrl.toString(), mimeType, byteSize: response.body.length, width: metadata.width || null, height: metadata.height || null, sha256: createHash("sha256").update(response.body).digest("hex"), imageBytes: response.body });
    } catch {
      failures.push({ position: item.position, isCover: item.isCover, code: "ASSET_DOWNLOAD_FAILED", detail: "圖片下載失敗" });
    }
  }
  return { assets, failures, complete: failures.filter((failure) => !failure.isCover).length === 0 };
}
