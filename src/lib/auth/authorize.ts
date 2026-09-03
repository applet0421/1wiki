import type { SessionUser } from "./session-core";

export function assertUser(user: SessionUser | null): SessionUser {
  if (!user) throw new Error("尚未登入");
  if (!user.isActive) throw new Error("帳號已停用");
  return user;
}

export function assertOwner(user: SessionUser | null): SessionUser & { role: "OWNER" } {
  const activeUser = assertUser(user);
  if (activeUser.role !== "OWNER") throw new Error("權限不足");
  return activeUser as SessionUser & { role: "OWNER" };
}
