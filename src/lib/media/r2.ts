import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function getR2Configuration(env: Record<string, string | undefined> = process.env) {
  const required = (key: string) => { const value = env[key]?.trim(); if (!value) throw new Error(`尚未設定 ${key}`); return value; };
  const publicBaseUrl = required("R2_PUBLIC_BASE_URL");
  const url = new URL(publicBaseUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("R2_PUBLIC_BASE_URL 必須是公開圖片網址");
  return {
    accountId: required("CLOUDFLARE_R2_ACCOUNT_ID"), bucket: required("CLOUDFLARE_R2_BUCKET"),
    accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"), secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"), publicBaseUrl,
  };
}

export async function uploadGeneratedImage(key: string, bytes: Buffer, mimeType: string) {
  const config = getR2Configuration();
  const client = new S3Client({ region: "auto", endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2 });
  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: bytes, ContentType: mimeType, CacheControl: "public, max-age=31536000, immutable" }), { abortSignal: AbortSignal.timeout(45000) });
    return new URL(key, `${config.publicBaseUrl.replace(/\/$/, "")}/`).toString();
  } catch { throw new Error("R2 上傳失敗，圖片已保留，可重試上傳。"); }
  finally { client.destroy(); }
}
