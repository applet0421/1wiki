import { Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword, verifyPassword } from "./password";

const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,49}$/;

export type CreateManagedUserInput = {
  username: string;
  displayName: string;
  temporaryPassword: string;
  role?: UserRole;
};

export async function createManagedUser(
  client: PrismaClient,
  input: CreateManagedUserInput,
) {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!usernamePattern.test(username)) throw new Error("帳號格式不正確");
  if (!displayName) throw new Error("顯示名稱不能空白");

  return client.user.create({
    data: {
      username,
      displayName,
      passwordHash: await hashPassword(input.temporaryPassword),
      role: input.role || "EDITOR",
      mustChangePassword: true,
    },
  });
}

export async function resetManagedPassword(
  client: PrismaClient,
  userId: string,
  temporaryPassword: string,
) {
  const passwordHash = await hashPassword(temporaryPassword);
  return client.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await transaction.session.deleteMany({ where: { userId } });
    return user;
  });
}

export async function changeOwnPassword(
  client: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const current = await client.user.findUnique({ where: { id: userId } });
  if (!current || !(await verifyPassword(current.passwordHash, currentPassword))) {
    throw new Error("目前密碼不正確");
  }
  const passwordHash = await hashPassword(newPassword);

  return client.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await transaction.session.deleteMany({ where: { userId } });
    return user;
  });
}

export async function updateManagedUser(
  client: PrismaClient,
  userId: string,
  changes: { role?: UserRole; isActive?: boolean; displayName?: string },
) {
  return client.$transaction(
    async (transaction) => {
      const current = await transaction.user.findUnique({ where: { id: userId } });
      if (!current) throw new Error("找不到帳號");

      const removesActiveOwner =
        current.role === "OWNER" &&
        current.isActive &&
        (changes.role === "EDITOR" || changes.isActive === false);
      if (removesActiveOwner) {
        const activeOwners = await transaction.user.count({
          where: { role: "OWNER", isActive: true },
        });
        if (activeOwners <= 1) throw new Error("不能變更最後一位 OWNER");
      }

      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          ...(changes.role ? { role: changes.role } : {}),
          ...(typeof changes.isActive === "boolean" ? { isActive: changes.isActive } : {}),
          ...(changes.displayName ? { displayName: changes.displayName.trim() } : {}),
        },
      });
      if (changes.isActive === false) {
        await transaction.session.deleteMany({ where: { userId } });
      }
      return user;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
