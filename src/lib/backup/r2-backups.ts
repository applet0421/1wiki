import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type BackupR2Configuration = { accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string; prefix: string };

const required = (env: Record<string, string | undefined>, key: string) => {
  const value = env[key]?.trim();
  if (!value) throw new Error(`缺少環境變數：${key}`);
  return value;
};

export function getBackupR2Configuration(env: Record<string, string | undefined> = process.env): BackupR2Configuration {
  return {
    accountId: required(env, "CLOUDFLARE_R2_ACCOUNT_ID"),
    bucket: required(env, "DATABASE_BACKUP_R2_BUCKET"),
    accessKeyId: required(env, "CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: required(env, "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    prefix: (env.DATABASE_BACKUP_R2_PREFIX || "database-backups").trim().replace(/^\/+|\/+$/g, ""),
  };
}

export function createBackupR2Client(config: BackupR2Configuration) {
  return new S3Client({ region: "auto", endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
}

export async function uploadBackup(config: BackupR2Configuration, body: NodeJS.ReadableStream, key: string, size: number) {
  const client = createBackupR2Client(config);
  await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body as never, ContentLength: size, ContentType: "application/octet-stream", ContentDisposition: `attachment; filename="${key.split("/").pop()}"` }));
}

export async function deleteBackupObject(config: BackupR2Configuration, key: string) {
  await createBackupR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function createBackupDownloadUrl(config: BackupR2Configuration, key: string) {
  return getSignedUrl(createBackupR2Client(config), new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn: 300 });
}
