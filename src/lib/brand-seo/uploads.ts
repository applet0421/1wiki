import { randomUUID } from "node:crypto";
import type { BrandAssetKind } from "./assets";

type FileInfo = { name: string; type: string; size: number };
type Options = { publicBaseUrl: string; now?: () => Date; randomId?: () => string };
const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;

export function createBrandAssetUpload(file: FileInfo, asset: BrandAssetKind, options: Options) {
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("請選擇圖片檔案");
  if (file.size > 10 * 1024 * 1024) throw new Error("圖片不可超過 10 MB");
  if (asset === "icon48" && file.type !== "image/png") throw new Error("圖示僅支援 PNG");
  if (asset !== "icon48" && !(file.type in extensions)) throw new Error("僅支援 JPEG、PNG 或 WebP 圖片");
  const contentType = file.type as keyof typeof extensions;
  const now = (options.now ?? (() => new Date()))();
  const key = `uploads/brand/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${(options.randomId ?? randomUUID)()}.${extensions[contentType]}`;
  return { key, contentType, publicUrl: new URL(key, `${options.publicBaseUrl.replace(/\/$/u, "")}/`).toString() };
}
