import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { hashPassword } from "@/lib/auth/password";
import { createCategory, deleteCategory, findAvailablePostSlug, getPublishedCategory, getPublishedPostBySlug, hasPublishedPosts, savePost } from "./repository";

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
      prisma.category.create({ data: { locale: "zh-tw", name: "AI", slug: "ai" } }),
    ]);
    return { author, category };
  }

  function postInput(categoryId: string, overrides: Record<string, unknown> = {}) {
    return {
      title: "ChatGPT 無法登入",
      locale: "zh-tw" as const,
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
      locale: "zh-tw",
      name: "3C 教學",
      slug: "devices",
      description: "裝置問題",
    });
    await savePost(prisma, author.id, postInput(extra.id));
    await expect(deleteCategory(prisma, extra.id)).rejects.toThrow("仍有文章");
  });

  it("finds the next numbered slug without overwriting an existing post", async () => {
    const { author, category } = await fixture();
    await savePost(prisma, author.id, postInput(category.id, { slug: "line-fix" }));
    await savePost(prisma, author.id, postInput(category.id, { slug: "line-fix-2" }));

    await expect(findAvailablePostSlug(prisma, "zh-tw", "line-fix")).resolves.toBe("line-fix-3");
  });

  it("stores AI review metadata and preserves it through a standard editor save", async () => {
    const { author, category } = await fixture();
    const generated = await savePost(prisma, author.id, postInput(category.id, {
      aiContentType: "TROUBLESHOOTING",
      primaryKeyword: "LINE 收不到通知",
      searchIntent: "排除 LINE 通知問題",
      aiSourceSupport: "STRONG",
      aiNeedsVerification: ["確認 Android 選單名稱"],
    }));

    await savePost(prisma, author.id, postInput(category.id, {
      id: generated.id,
      title: "人工修改後標題",
    }));

    const stored = await prisma.post.findUniqueOrThrow({ where: { id: generated.id } });
    expect(stored).toMatchObject({
      aiContentType: "TROUBLESHOOTING",
      primaryKeyword: "LINE 收不到通知",
      searchIntent: "排除 LINE 通知問題",
      aiSourceSupport: "STRONG",
      aiNeedsVerification: ["確認 Android 選單名稱"],
    });
  });

  it("allows the same slug in different locales and isolates public reads", async () => {
    const { author } = await fixture();
    const en = await createCategory(prisma, { locale: "en", name: "AI", slug: "ai", description: "AI guides" });
    const ja = await createCategory(prisma, { locale: "ja", name: "AI", slug: "ai", description: "AI ガイド" });

    await savePost(prisma, author.id, postInput(en.id, { locale: "en", slug: "shared", status: "PUBLISHED" }));
    await savePost(prisma, author.id, postInput(ja.id, { locale: "ja", slug: "shared", status: "PUBLISHED" }));

    await expect(getPublishedPostBySlug(prisma, "en", "shared")).resolves.toMatchObject({ locale: "en" });
    await expect(getPublishedPostBySlug(prisma, "zh-tw", "shared")).resolves.toBeNull();
  });

  it("rejects a category from another locale", async () => {
    const { author, category } = await fixture();
    await expect(savePost(prisma, author.id, postInput(category.id, { locale: "en" })))
      .rejects.toThrow("文章語系必須與分類一致");
  });

  it("reports whether a locale has published content", async () => {
    const { author, category } = await fixture();
    await expect(hasPublishedPosts(prisma, "en")).resolves.toBe(false);
    await savePost(prisma, author.id, postInput(category.id, { status: "PUBLISHED" }));
    await expect(hasPublishedPosts(prisma, "zh-tw")).resolves.toBe(true);
  });

  it("does not expose a category without published posts", async () => {
    const { category } = await fixture();
    await expect(getPublishedCategory(prisma, "zh-tw", category.slug)).resolves.toBeNull();
  });
});
