import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { resetDatabase } from "../../tests/helpers/database";
import { getSitemapContent } from "./sitemap-data";

describe("sitemap content", () => {
  beforeEach(resetDatabase);

  it("contains published articles but excludes drafts", async () => {
    const author = await prisma.user.create({ data: { username: "owner", displayName: "站長", passwordHash: await hashPassword("secure-owner-2026"), role: "OWNER", mustChangePassword: false } });
    const [category, enCategory, jaCategory] = await Promise.all([
      prisma.category.create({ data: { locale: "zh-tw", name: "AI", slug: "ai" } }),
      prisma.category.create({ data: { locale: "en", name: "AI", slug: "ai" } }),
      prisma.category.create({ data: { locale: "ja", name: "AI", slug: "ai" } }),
    ]);
    await prisma.post.createMany({ data: [
      { locale: "zh-tw", title: "公開", slug: "published", excerpt: "摘要", contentHtml: "<p>內容</p>", status: "PUBLISHED", publishedAt: new Date("2026-09-01"), authorId: author.id, categoryId: category.id },
      { locale: "zh-tw", title: "草稿", slug: "draft", excerpt: "摘要", contentHtml: "<p>內容</p>", status: "DRAFT", authorId: author.id, categoryId: category.id },
      { locale: "en", title: "Published", slug: "published", excerpt: "Summary", contentHtml: "<p>Body</p>", status: "PUBLISHED", publishedAt: new Date("2026-09-02"), authorId: author.id, categoryId: enCategory.id },
      { locale: "ja", title: "下書き", slug: "draft", excerpt: "概要", contentHtml: "<p>本文</p>", status: "DRAFT", authorId: author.id, categoryId: jaCategory.id },
    ] });

    const content = await getSitemapContent(prisma, "https://1wiki.example");
    expect(content.map((entry) => entry.url)).toContain("https://1wiki.example/zh-tw/articles/published");
    expect(content.map((entry) => entry.url)).toContain("https://1wiki.example/en/articles/published");
    expect(content.map((entry) => entry.url)).not.toContain("https://1wiki.example/zh-tw/articles/draft");
    expect(content.map((entry) => entry.url)).not.toContain("https://1wiki.example/ja");
    expect(content.map((entry) => entry.url)).not.toContain("https://1wiki.example/en/about");
  });

  it("contains every published category ancestor at its canonical hierarchy URL", async () => {
    const author = await prisma.user.create({ data: { username: "hierarchy-owner", displayName: "站長", passwordHash: await hashPassword("secure-owner-2026"), role: "OWNER", mustChangePassword: false } });
    const categoryUpdatedAt = new Date("2026-09-01T00:00:00.000Z");
    const articleUpdatedAt = new Date("2026-09-04T00:00:00.000Z");
    const root = await prisma.category.create({ data: { locale: "zh-tw", name: "AI", slug: "ai", updatedAt: categoryUpdatedAt } });
    const child = await prisma.category.create({ data: { locale: "zh-tw", name: "ChatGPT", slug: "chatgpt", parentId: root.id, updatedAt: categoryUpdatedAt } });
    const leaf = await prisma.category.create({ data: { locale: "zh-tw", name: "Prompt", slug: "prompt", parentId: child.id, updatedAt: categoryUpdatedAt } });
    await prisma.post.create({ data: { locale: "zh-tw", title: "Leaf guide", slug: "leaf-guide", excerpt: "摘要", contentHtml: "<p>內容</p>", status: "PUBLISHED", publishedAt: new Date("2026-09-03"), updatedAt: articleUpdatedAt, authorId: author.id, categoryId: leaf.id } });

    const content = await getSitemapContent(prisma, "https://1wiki.example");
    const urls = content.map(({ url }) => url);
    expect(urls).toContain("https://1wiki.example/zh-tw/category/ai");
    expect(urls).toContain("https://1wiki.example/zh-tw/category/ai/chatgpt");
    expect(urls).toContain("https://1wiki.example/zh-tw/category/ai/chatgpt/prompt");
    expect(urls).not.toContain("https://1wiki.example/zh-tw/ai");
    expect(content.find(({ url }) => url.endsWith("/category/ai"))?.lastModified).toEqual(articleUpdatedAt);
  });
});

it("includes archived authors with published work while excluding unassigned profiles", async () => {
  await resetDatabase();
  const author = await prisma.author.create({ data: { locale: "en", name: "Writer", slug: "writer", archivedAt: new Date() } });
  await prisma.author.create({ data: { locale: "en", name: "Unused", slug: "unused" } });
  const user = await prisma.user.create({ data: { username: "writer", displayName: "Editor", passwordHash: "test" } });
  const category = await prisma.category.create({ data: { locale: "en", name: "AI", slug: "ai" } });
  await prisma.post.create({ data: { locale: "en", title: "Article", slug: "article", status: "PUBLISHED", publishedAt: new Date(), authorId: user.id, bylineId: author.id, categoryId: category.id } });
  const urls = (await getSitemapContent(prisma, "https://1wiki.example")).map(({ url }) => url);
  expect(urls).toContain("https://1wiki.example/en/authors/writer");
  expect(urls).not.toContain("https://1wiki.example/en/authors/unused");
});
