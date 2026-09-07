import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/auth/session";
import { createBrandAssetUpload } from "@/lib/brand-seo/uploads";
import type { BrandAssetKind } from "@/lib/brand-seo/assets";

export const runtime = "nodejs";

function env(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`尚未設定 ${name}`); return value; }
function asset(value: unknown): BrandAssetKind { if (value === "icon48" || value === "logo" || value === "defaultOg") return value; throw new Error("品牌圖片類型不正確"); }

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  if (!user.isActive || user.role !== "OWNER" || user.mustChangePassword) return Response.json({ error: user.mustChangePassword ? "請先變更密碼" : "權限不足" }, { status: 403 });
  try {
    const body = await request.json() as { asset?: unknown; file?: { name?: unknown; type?: unknown; size?: unknown } };
    if (!body.file || typeof body.file.name !== "string" || typeof body.file.type !== "string" || typeof body.file.size !== "number") throw new Error("圖片資料格式不正確");
    const upload = createBrandAssetUpload({ name: body.file.name, type: body.file.type, size: body.file.size }, asset(body.asset), { publicBaseUrl: env("R2_PUBLIC_BASE_URL") });
    const client = new S3Client({ region: "auto", endpoint: `https://${env("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env("CLOUDFLARE_R2_ACCESS_KEY_ID"), secretAccessKey: env("CLOUDFLARE_R2_SECRET_ACCESS_KEY") } });
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: env("CLOUDFLARE_R2_BUCKET"), Key: upload.key, ContentType: upload.contentType, CacheControl: "public, max-age=31536000, immutable" }), { expiresIn: 300 });
    return Response.json({ asset: body.asset, uploadUrl, publicUrl: upload.publicUrl });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "無法建立圖片上傳網址" }, { status: 400 }); }
}
