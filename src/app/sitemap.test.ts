import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { resetDatabase } from "../../tests/helpers/database";
import { getSitemapContent } from "./sitemap-data";

describe("sitemap content", () => {
  beforeEach(resetDatabase);

  it("contains published articles but excludes drafts", async () => {
    const author = await prisma.user.create({ data: { username: "owner", displayName: "站長", passwordHash: await hashPassword("secure-owner-2026"), role: "OWNER", mustChangePassword: false } });
    const category = await prisma.category.create({ data: { name: "AI", slug: "ai" } });
    await prisma.post.createMany({ data: [
      { title: "公開", slug: "published", excerpt: "摘要", contentHtml: "<p>內容</p>", status: "PUBLISHED", publishedAt: new Date("2026-09-01"), authorId: author.id, categoryId: category.id },
      { title: "草稿", slug: "draft", excerpt: "摘要", contentHtml: "<p>內容</p>", status: "DRAFT", authorId: author.id, categoryId: category.id },
    ] });

    const content = await getSitemapContent(prisma, "https://1wiki.example");
    expect(content.map((entry) => entry.url)).toContain("https://1wiki.example/articles/published");
    expect(content.map((entry) => entry.url)).not.toContain("https://1wiki.example/articles/draft");
  });
});
