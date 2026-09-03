import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { hashPassword } from "./password";
import { authenticateUser, InvalidCredentialsError } from "./login";

describe("authenticateUser", () => {
  beforeEach(resetDatabase);

  async function createUser(overrides: Record<string, unknown> = {}) {
    return prisma.user.create({
      data: {
        username: "owner",
        displayName: "站長",
        passwordHash: await hashPassword("secure-owner-2026"),
        role: "OWNER",
        isActive: true,
        mustChangePassword: false,
        ...overrides,
      },
    });
  }

  it("authenticates a normalized username and clears failed attempts", async () => {
    await createUser({ failedLoginAttempts: 3 });

    const user = await authenticateUser(prisma, " OWNER ", "secure-owner-2026");
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(user.username).toBe("owner");
    expect(stored.failedLoginAttempts).toBe(0);
    expect(stored.lockedUntil).toBeNull();
  });

  it("uses the same public error for unknown and wrong credentials", async () => {
    await createUser();

    await expect(authenticateUser(prisma, "missing", "wrong-password-2026"))
      .rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(authenticateUser(prisma, "owner", "wrong-password-2026"))
      .rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("locks an account for 15 minutes on the fifth failure", async () => {
    const now = new Date("2026-09-04T00:00:00.000Z");
    await createUser({ failedLoginAttempts: 4 });

    await expect(
      authenticateUser(prisma, "owner", "wrong-password-2026", now),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    const stored = await prisma.user.findUniqueOrThrow({ where: { username: "owner" } });
    expect(stored.failedLoginAttempts).toBe(5);
    expect(stored.lockedUntil?.toISOString()).toBe("2026-09-04T00:15:00.000Z");
  });

  it("does not authenticate an inactive account", async () => {
    await createUser({ isActive: false });
    await expect(authenticateUser(prisma, "owner", "secure-owner-2026"))
      .rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
