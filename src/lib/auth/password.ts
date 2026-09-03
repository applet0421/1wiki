import argon2 from "argon2";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "密碼至少需要 12 個字元")
  .regex(/\p{Letter}/u, "密碼必須包含英文字母")
  .regex(/[0-9]/, "密碼必須包含數字");

export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}

export async function hashPassword(password: string): Promise<string> {
  passwordSchema.parse(password);
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
