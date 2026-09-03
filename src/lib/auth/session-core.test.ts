import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { hashPassword } from "./password";
import { createDatabaseSession, getSessionUser, hashSessionToken } from "./session-core";

describe("database sessions", () => {
  beforeEach(resetDatabase);

  async function createUser() {
    return prisma.user.create({
      data: {
        username: "owner",
        displayName: "站長",
        passwordHash: await hashPassword("secure-owner-2026"),
        role: "OWNER",
        mustChangePassword: false,
      },
    });
  }

  it("returns a raw token but stores only its keyed hash", async () => {
    const user = await createUser();
    const now = new Date("2026-09-04T00:00:00.000Z");
    const session = await createDatabaseSession(prisma, user.id, "secret", now);
    const stored = await prisma.session.findFirstOrThrow();

    expect(stored.tokenHash).not.toBe(session.token);
    expect(stored.tokenHash).toBe(hashSessionToken(session.token, "secret"));
    expect(stored.expiresAt.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });

  it("rejects expired and inactive sessions", async () => {
    const user = await createUser();
    const created = await createDatabaseSession(
      prisma,
      user.id,
      "secret",
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(
      await getSessionUser(prisma, created.token, "secret", new Date("2026-09-09T00:00:00.000Z")),
    ).toBeNull();

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect(
      await getSessionUser(prisma, created.token, "secret", new Date("2026-09-02T00:00:00.000Z")),
    ).toBeNull();
  });
});
