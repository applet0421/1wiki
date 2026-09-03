import { Prisma, type PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { hashPassword, validatePassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db/prisma";

export type BootstrapOwnerInput = {
  username: string;
  password: string;
  displayName: string;
};

function normalizeInput(input: BootstrapOwnerInput): BootstrapOwnerInput {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!username || !/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) {
    throw new Error("初始 OWNER 帳號格式不正確");
  }
  if (!displayName) {
    throw new Error("初始 OWNER 顯示名稱不能空白");
  }
  const passwordResult = validatePassword(input.password);
  if (!passwordResult.success) {
    throw new Error(passwordResult.error.issues[0]?.message || "密碼格式不正確");
  }

  return { username, password: input.password, displayName };
}

export async function bootstrapOwner(
  client: PrismaClient,
  rawInput: BootstrapOwnerInput,
): Promise<void> {
  const input = normalizeInput(rawInput);
  const passwordHash = await hashPassword(input.password);

  await client.$transaction(
    async (transaction) => {
      const ownerCount = await transaction.user.count({ where: { role: "OWNER" } });
      if (ownerCount > 0) {
        throw new Error("OWNER 已存在，初始化命令拒絕覆寫");
      }

      await transaction.user.create({
        data: {
          username: input.username,
          displayName: input.displayName,
          passwordHash,
          role: "OWNER",
          isActive: true,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function main() {
  const input = {
    username: process.env.INITIAL_OWNER_USERNAME || "",
    password: process.env.INITIAL_OWNER_PASSWORD || "",
    displayName: process.env.INITIAL_OWNER_DISPLAY_NAME || "",
  };
  await bootstrapOwner(prisma, input);
  process.stdout.write("初始 OWNER 已建立；請立即移除 INITIAL_OWNER_PASSWORD。\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "OWNER 初始化失敗";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
