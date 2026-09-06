import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "@/lib/db/prisma";
import { getBackupR2Configuration, uploadBackup } from "./r2-backups";

const execFileAsync = promisify(execFile);

function safeFilename(date: Date) {
  return `onewiki-${date.toISOString().replace(/[:.]/g, "-")}.dump`;
}

export async function runDatabaseBackup(backupId: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "onewiki-db-backup-"));
  const fileName = safeFilename(new Date());
  const outputPath = join(tempDir, fileName);
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("缺少 DATABASE_URL");
    await execFileAsync("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", outputPath, databaseUrl], { maxBuffer: 1024 * 1024 });
    const file = await stat(outputPath);
    const checksum = await new Promise<string>((resolve, reject) => {
      const hash = createHash("sha256");
      const stream = createReadStream(outputPath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(hash.digest("hex")));
    });
    const config = getBackupR2Configuration();
    const objectKey = `${config.prefix}/${fileName}`;
    await uploadBackup(config, createReadStream(outputPath), objectKey, file.size);
    await prisma.databaseBackup.update({ where: { id: backupId }, data: { status: "SUCCESS", objectKey, fileName, fileSize: file.size, checksum, completedAt: new Date(), error: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "未知備份錯誤";
    await prisma.databaseBackup.update({ where: { id: backupId }, data: { status: "FAILURE", completedAt: new Date(), error: message } }).catch(() => undefined);
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
