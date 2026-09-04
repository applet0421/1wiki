import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { seedCategories } from "../../prisma/seed";
import { bootstrapOwner } from "../../scripts/bootstrap-owner";

describe("database initialization", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seeds the three initial categories idempotently", async () => {
    await seedCategories(prisma);
    await seedCategories(prisma);

    const categories = await prisma.category.findMany({ orderBy: { slug: "asc" } });
    expect(categories.map(({ slug }) => slug)).toEqual(["ai", "social", "software"]);
    expect(categories).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug: "ai",
        parentId: null,
        showInNavigation: true,
        sortOrder: 0,
      }),
    ]));
    expect(categories.every(({ parentId }) => parentId === null)).toBe(true);
    expect(categories.every(({ showInNavigation }) => showInNavigation)).toBe(true);
  });

  it("creates the first owner and refuses to overwrite it", async () => {
    const input = {
      username: "SiteOwner",
      password: "secure-owner-2026",
      displayName: "站長",
    };

    await bootstrapOwner(prisma, input);
    const first = await prisma.user.findUniqueOrThrow({ where: { username: "siteowner" } });

    await expect(
      bootstrapOwner(prisma, { ...input, password: "replacement-2026" }),
    ).rejects.toThrow("OWNER 已存在");

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { username: "siteowner" } });
    expect(unchanged.passwordHash).toBe(first.passwordHash);
    expect(unchanged.role).toBe("OWNER");
  });

  it("rejects weak passwords without creating an owner", async () => {
    await expect(
      bootstrapOwner(prisma, {
        username: "owner",
        password: "weak",
        displayName: "站長",
      }),
    ).rejects.toThrow("密碼");

    expect(await prisma.user.count()).toBe(0);
  });
});
