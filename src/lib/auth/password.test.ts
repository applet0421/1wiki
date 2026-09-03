import { describe, expect, it } from "vitest";
import { hashPassword, validatePassword, verifyPassword } from "./password";

describe("password security", () => {
  it("stores an Argon2id hash and verifies only the original password", async () => {
    const hash = await hashPassword("secure-owner-2026");

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "secure-owner-2026")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password-2026")).toBe(false);
  });

  it("requires at least 12 characters with a letter and number", () => {
    expect(validatePassword("short1").success).toBe(false);
    expect(validatePassword("只有中文字沒有數字").success).toBe(false);
    expect(validatePassword("longpasswordonly").success).toBe(false);
    expect(validatePassword("可用的密碼password2026").success).toBe(true);
  });
});
