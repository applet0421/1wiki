import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { changeOwnPassword, createManagedUser, resetManagedPassword, updateManagedUser } from "./accounts";
import { hashPassword, verifyPassword } from "./password";

describe("managed admin accounts", () => {
  beforeEach(resetDatabase);

  async function createOwner(username = "owner") {
    return prisma.user.create({
      data: {
        username,
        displayName: username,
        passwordHash: await hashPassword("secure-owner-2026"),
        role: "OWNER",
        mustChangePassword: false,
      },
    });
  }

  it("creates normalized editors that must change their temporary password", async () => {
    const user = await createManagedUser(prisma, {
      username: " New.Editor ",
      displayName: "編輯",
      temporaryPassword: "temporary-pass-2026",
    });

    expect(user.username).toBe("new.editor");
    expect(user.role).toBe("EDITOR");
    expect(user.mustChangePassword).toBe(true);
  });

  it("resets a password and revokes all existing sessions", async () => {
    const user = await createOwner();
    await prisma.session.create({
      data: { userId: user.id, tokenHash: "hash", expiresAt: new Date("2030-01-01") },
    });

    await resetManagedPassword(prisma, user.id, "replacement-pass-2026");

    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).mustChangePassword)
      .toBe(true);
  });

  it("protects the last active owner from demotion or deactivation", async () => {
    const owner = await createOwner();

    await expect(
      updateManagedUser(prisma, owner.id, { role: "EDITOR" }),
    ).rejects.toThrow("最後一位 OWNER");
    await expect(
      updateManagedUser(prisma, owner.id, { isActive: false }),
    ).rejects.toThrow("最後一位 OWNER");
  });

  it("allows changing one owner when another active owner exists", async () => {
    const owner = await createOwner("owner-one");
    await createOwner("owner-two");

    const updated = await updateManagedUser(prisma, owner.id, { role: "EDITOR" });
    expect(updated.role).toBe("EDITOR");
  });

  it("updates a managed user's display name and rejects blank names", async () => {
    const owner = await createOwner();

    const updated = await updateManagedUser(prisma, owner.id, { displayName: "  新站長  " });
    expect(updated.displayName).toBe("新站長");

    await expect(
      updateManagedUser(prisma, owner.id, { displayName: "   " }),
    ).rejects.toThrow("顯示名稱不能空白");
  });

  it("changes the current password, clears the temporary flag, and revokes sessions", async () => {
    const user = await createManagedUser(prisma, {
      username: "editor",
      displayName: "編輯",
      temporaryPassword: "temporary-pass-2026",
    });
    await prisma.session.create({
      data: { userId: user.id, tokenHash: "session", expiresAt: new Date("2030-01-01") },
    });

    await changeOwnPassword(
      prisma,
      user.id,
      "temporary-pass-2026",
      "permanent-pass-2026",
    );

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.mustChangePassword).toBe(false);
    expect(await verifyPassword(updated.passwordHash, "permanent-pass-2026")).toBe(true);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });
});
