import { randomUUID } from "node:crypto";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const extensionsByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type ImageFile = { name: string; type: string; size: number };
type Options = { publicBaseUrl: string; now?: () => Date; randomId?: () => string };

export type ImageUpload = { key: string; contentType: keyof typeof extensionsByContentType; publicUrl: string };

export function createImageUpload(file: ImageFile, options: Options): ImageUpload {
  if (!(file.type in extensionsByContentType)) throw new Error("僅支援 JPEG、PNG、WebP 或 GIF 圖片");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("圖片不可超過 10 MB");
  if (file.size <= 0) throw new Error("請選擇圖片檔案");

  const contentType = file.type as ImageUpload["contentType"];
  const date = (options.now || (() => new Date()))();
  const key = `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${(options.randomId || randomUUID)()}.${extensionsByContentType[contentType]}`;
  const publicUrl = new URL(key, `${options.publicBaseUrl.replace(/\/$/, "")}/`).toString();
  return { contentType, key, publicUrl };
}
