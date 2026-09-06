import { describe, expect, it } from "vitest";
import { getBackupR2Configuration } from "./r2-backups";

describe("private database backup R2 configuration", () => {
  it("does not require the public media URL", () => {
    expect(getBackupR2Configuration({
      CLOUDFLARE_R2_ACCOUNT_ID: "account",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret",
      DATABASE_BACKUP_R2_BUCKET: "private-backups",
      DATABASE_BACKUP_R2_PREFIX: "db",
    })).toEqual({ accountId: "account", bucket: "private-backups", accessKeyId: "key", secretAccessKey: "secret", prefix: "db" });
  });

  it("requires a separate backup bucket", () => {
    expect(() => getBackupR2Configuration({ CLOUDFLARE_R2_ACCOUNT_ID: "account" })).toThrow("DATABASE_BACKUP_R2_BUCKET");
  });
});
