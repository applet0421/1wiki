import type { PrismaClient, User } from "@prisma/client";
import { verifyPassword } from "./password";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,p=1,t=2$XNhYLaBiv3dr1Ww6R7zp1Q$xkx+8dpqNQo1cehYFXToQ+jMm4KDX4uQC5jYKqQmQfk";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("帳號或密碼不正確，或帳號暫時無法登入");
    this.name = "InvalidCredentialsError";
  }
}

export async function authenticateUser(
  client: PrismaClient,
  rawUsername: string,
  password: string,
  now = new Date(),
): Promise<User> {
  const username = rawUsername.trim().toLowerCase();
  const user = await client.user.findUnique({ where: { username } });

  if (!user) {
    await verifyPassword(DUMMY_PASSWORD_HASH, password);
    throw new InvalidCredentialsError();
  }

  if (!user.isActive || (user.lockedUntil && user.lockedUntil > now)) {
    await verifyPassword(user.passwordHash, password);
    throw new InvalidCredentialsError();
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    const failures = user.lockedUntil && user.lockedUntil <= now
      ? 1
      : user.failedLoginAttempts + 1;
    await client.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failures,
        lockedUntil: failures >= 5
          ? new Date(now.getTime() + 15 * 60 * 1000)
          : null,
      },
    });
    throw new InvalidCredentialsError();
  }

  return client.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}
