import type { PrismaClient, UserRole } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

export function hashSessionToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function createDatabaseSession(
  client: PrismaClient,
  userId: string,
  secret: string,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await client.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token, secret),
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function getSessionUser(
  client: PrismaClient,
  token: string,
  secret: string,
  now = new Date(),
): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await client.session.findUnique({
    where: { tokenHash: hashSessionToken(token, secret) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt <= now || !session.user.isActive) {
    await client.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const { id, username, displayName, role, isActive, mustChangePassword } = session.user;
  return { id, username, displayName, role, isActive, mustChangePassword };
}
