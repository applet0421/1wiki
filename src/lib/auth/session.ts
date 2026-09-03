import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { createDatabaseSession, getSessionUser, hashSessionToken } from "./session-core";

const SESSION_COOKIE = "onewiki_session";

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("AUTH_SESSION_SECRET 尚未正確設定");
  return secret;
}

export async function createUserSession(userId: string): Promise<void> {
  const session = await createDatabaseSession(prisma, userId, getSessionSecret());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(prisma, token, getSessionSecret());
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSessionToken(token, getSessionSecret()) },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}
