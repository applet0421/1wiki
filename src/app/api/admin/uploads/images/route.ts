import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/auth/session";
import { createImageUpload } from "@/lib/media/image-upload";

export const runtime = "nodejs";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`尚未設定 ${name}`);
  return value;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  if (user.mustChangePassword) return Response.json({ error: "請先變更密碼" }, { status: 403 });

  try {
    const file = await request.json() as { name?: unknown; type?: unknown; size?: unknown };
    if (typeof file.name !== "string" || typeof file.type !== "string" || typeof file.size !== "number") {
      throw new Error("圖片資料格式不正確");
    }
    const accountId = requiredEnvironment("CLOUDFLARE_R2_ACCOUNT_ID");
    const bucket = requiredEnvironment("CLOUDFLARE_R2_BUCKET");
    const upload = createImageUpload(
      { name: file.name, type: file.type, size: file.size },
      { publicBaseUrl: requiredEnvironment("R2_PUBLIC_BASE_URL") },
    );
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnvironment("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnvironment("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
      },
    });
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket,
      Key: upload.key,
      ContentType: upload.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }), { expiresIn: 300 });
    return Response.json({ uploadUrl, publicUrl: upload.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法建立圖片上傳網址";
    return Response.json({ error: message }, { status: 400 });
  }
}
