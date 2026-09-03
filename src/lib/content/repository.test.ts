import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { hashPassword } from "@/lib/auth/password";
import { createCategory, deleteCategory, savePost } from "./repository";

describe("content repository", () => {
  beforeEach(resetDatabase);

  async function fixture() {
    const [author, category] = await Promise.all([
      prisma.user.create({
        data: {
          username: "editor",
          displayName: "編輯",
          passwordHash: await hashPassword("secure-editor-2026"),
          mustChangePassword: false,
        },
      }),
      prisma.category.create({ data: { name: "AI", slug: "ai" } }),
    ]);
    return { author, category };
  }

  function postInput(categoryId: string, overrides: Record<string, unknown> = {}) {
    return {
      title: "ChatGPT 無法登入",
      slug: "chatgpt-無法登入",
      excerpt: "依序排除 ChatGPT 登入問題。",
      contentHtml: "<p>先確認網路。</p>",
      coverImage: "",
      status: "DRAFT" as const,
      categoryId,
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
      canonicalUrl: "",
      ...overrides,
    };
  }

  it("sanitizes HTML before saving a draft", async () => {
    const { author, category } = await fixture();
    const post = await savePost(prisma, author.id, postInput(category.id, {
      contentHtml: '<p onclick="bad()">安全</p><script>alert(1)</script>',
    }));

    expect(post.contentHtml).toBe("<p>安全</p>");
  });

  it("returns a stable slug error instead of overwriting another post", async () => {
    const { author, category } = await fixture();
    await savePost(prisma, author.id, postInput(category.id));

    await expect(savePost(prisma, author.id, postInput(category.id)))
      .rejects.toThrow("網址代稱已被使用");
    expect(await prisma.post.count()).toBe(1);
  });

  it("requires complete content for publication and preserves the first publish time", async () => {
    const { author, category } = await fixture();
    await expect(savePost(prisma, author.id, postInput(category.id, {
      status: "PUBLISHED",
      excerpt: "",
    }))).rejects.toThrow("摘要");

    const publishedAt = new Date("2026-09-04T01:00:00.000Z");
    const published = await savePost(
      prisma,
      author.id,
      postInput(category.id, { status: "PUBLISHED" }),
      publishedAt,
    );
    const draftAgain = await savePost(
      prisma,
      author.id,
      postInput(category.id, { id: published.id, status: "DRAFT" }),
      new Date("2026-09-05T01:00:00.000Z"),
    );

    expect(published.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    expect(draftAgain.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
  });

  it("protects initial categories and categories that contain posts", async () => {
    const { author, category } = await fixture();
    await expect(deleteCategory(prisma, category.id)).rejects.toThrow("預設分類");

    const extra = await createCategory(prisma, {
      name: "3C 教學",
      slug: "devices",
      description: "裝置問題",
    });
    await savePost(prisma, author.id, postInput(extra.id));
    await expect(deleteCategory(prisma, extra.id)).rejects.toThrow("仍有文章");
  });
});
