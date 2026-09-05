import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getNextCategoryArticle } from "./next-article";

it("returns only same-category published articles in stable order without repeating the source", async () => {
  const rollback = new Error("rollback test fixtures");
  try {
    await prisma.$transaction(async (tx) => {
      const suffix = randomUUID();
      const author = await tx.user.create({ data: { username: `feed-${suffix}`, displayName: "Feed test", passwordHash: "unused-test-hash" } });
      const category = await tx.category.create({ data: { locale: "zh-tw", name: "Feed", slug: `feed-${suffix}` } });
      const other = await tx.category.create({ data: { locale: "zh-tw", name: "Other", slug: `other-${suffix}` } });
      const english = await tx.category.create({ data: { locale: "en", name: "English", slug: `en-${suffix}` } });
      const date = new Date("2026-09-01T00:00:00Z");
      const source = await tx.post.create({ data: { locale: "zh-tw", title: "Source", slug: `source-${suffix}`, categoryId: category.id, authorId: author.id, status: "PUBLISHED", publishedAt: date } });
      const create = (id: string, overrides = {}) => tx.post.create({ data: { id: `${suffix}-${id}`, locale: "zh-tw", title: id, slug: `${suffix}-${id}`, categoryId: category.id, authorId: author.id, status: "PUBLISHED", publishedAt: date, ...overrides } });
      await create("a");
      await create("b");
      await create("draft", { status: "DRAFT" });
      await create("future", { publishedAt: new Date("2099-01-01") });
      await create("other", { categoryId: other.id });
      await create("english", { locale: "en", categoryId: english.id });
      const first = await getNextCategoryArticle(tx, "zh-tw", source.slug, null);
      expect(first?.title).toBe("b");
      const second = await getNextCategoryArticle(tx, "zh-tw", source.slug, first!.id);
      expect(second?.title).toBe("a");
      expect(await getNextCategoryArticle(tx, "zh-tw", source.slug, second!.id)).toBeNull();
      expect(await getNextCategoryArticle(tx, "en", source.slug, null)).toBeNull();
      expect(await getNextCategoryArticle(tx, "zh-tw", source.slug, `${suffix}-other`)).toBeNull();
      expect(await getNextCategoryArticle(tx, "zh-tw", `${suffix}-draft`, null)).toBeNull();
      throw rollback;
    }, { timeout: 15000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
