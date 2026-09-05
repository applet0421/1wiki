import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { hashPassword } from "@/lib/auth/password";
import {
  createCategory,
  deleteCategory,
  findAvailablePostSlug,
  getCategoryAncestors,
  getCategoryDescendantIds,
  getPublishedCategory,
  getPublishedCategoryTreePage,
  getPublishedPostBySlug,
  hasPublishedPosts,
  listAdminPosts,
  listNavigationCategories,
  listPublishedRootCategories,
  resolveCategoryPath,
  savePost,
  updateCategory,
} from "./repository";

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

  function categoryInput(overrides: Record<string, unknown> = {}) {
    return {
      locale: "zh-tw" as const,
      name: "分類",
      slug: "category",
      description: "",
      parentId: null,
      showInNavigation: false,
      sortOrder: 0,
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

  it("uses the first content image as the cover when publishing without one", async () => {
    const { author, category } = await fixture();
    const post = await savePost(prisma, author.id, postInput(category.id, {
      status: "PUBLISHED",
      contentHtml: '<p>說明</p><img src="https://cdn.example.com/first.jpg"><img src="https://cdn.example.com/second.jpg">',
    }));

    expect(post.coverImage).toBe("https://cdn.example.com/first.jpg");
  });

  it("allows empty former default categories to be deleted but protects categories with posts", async () => {
    const { author, category } = await fixture();
    await expect(deleteCategory(prisma, category.id)).resolves.toMatchObject({ id: category.id });

    const extra = await createCategory(prisma, {
      locale: "zh-tw",
      name: "3C 教學",
      slug: "devices",
      description: "裝置問題",
    });
    await savePost(prisma, author.id, postInput(extra.id));
    await expect(deleteCategory(prisma, extra.id)).rejects.toThrow("仍有文章");
  });

  it("creates three levels and resolves their ancestors, descendants, and path", async () => {
    const root = await createCategory(prisma, categoryInput({ name: "AI", slug: "ai", showInNavigation: true }));
    const child = await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id, showInNavigation: true }));
    const leaf = await createCategory(prisma, categoryInput({ name: "Prompt", slug: "prompt", parentId: child.id }));

    await expect(getCategoryAncestors(prisma, leaf.id)).resolves.toMatchObject([{ id: root.id }, { id: child.id }]);
    await expect(getCategoryDescendantIds(prisma, root.id)).resolves.toEqual([root.id, child.id, leaf.id]);
    await expect(resolveCategoryPath(prisma, "zh-tw", ["ai", "chatgpt", "prompt"])).resolves.toMatchObject({ id: leaf.id });
    await expect(resolveCategoryPath(prisma, "zh-tw", ["chatgpt", "ai"])).resolves.toBeNull();
    await expect(prisma.category.findUniqueOrThrow({ where: { id: child.id } })).resolves.toMatchObject({ showInNavigation: false });
  });

  it("rejects a parent from another locale", async () => {
    const zhRoot = await createCategory(prisma, categoryInput({ name: "AI", slug: "ai" }));

    await expect(createCategory(prisma, categoryInput({
      locale: "en",
      name: "Wrong locale",
      slug: "wrong-locale",
      parentId: zhRoot.id,
    }))).rejects.toThrow("上層分類必須與目前分類使用相同語系");
  });

  it("rejects a fourth category level", async () => {
    const root = await createCategory(prisma, categoryInput({ name: "AI", slug: "ai" }));
    const child = await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id }));
    const leaf = await createCategory(prisma, categoryInput({ name: "Prompt", slug: "prompt", parentId: child.id }));

    await expect(createCategory(prisma, categoryInput({
      name: "Examples",
      slug: "examples",
      parentId: leaf.id,
    }))).rejects.toThrow("分類最多只能有三級");
  });

  it("rejects cycles and moves that make descendants exceed three levels", async () => {
    const root = await createCategory(prisma, categoryInput({ name: "AI", slug: "ai" }));
    const child = await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id }));
    const leaf = await createCategory(prisma, categoryInput({ name: "Prompt", slug: "prompt", parentId: child.id }));
    const otherRoot = await createCategory(prisma, categoryInput({ name: "Software", slug: "software" }));
    const otherChild = await createCategory(prisma, categoryInput({ name: "macOS", slug: "macos", parentId: otherRoot.id }));

    await expect(updateCategory(prisma, root.id, categoryInput({
      name: "AI",
      slug: "ai",
      parentId: leaf.id,
    }))).rejects.toThrow("分類不能移到自己或自己的子分類下");

    await expect(updateCategory(prisma, child.id, categoryInput({
      name: "ChatGPT",
      slug: "chatgpt",
      parentId: otherChild.id,
    }))).rejects.toThrow("移動後的分類層級會超過三級");
  });

  it("serializes concurrent moves so they cannot create a fourth level", async () => {
    for (let index = 0; index < 4; index += 1) {
      const suffix = `-${index}`;
      const movableRoot = await createCategory(prisma, categoryInput({ name: `Movable${suffix}`, slug: `movable${suffix}` }));
      const firstRoot = await createCategory(prisma, categoryInput({ name: `First${suffix}`, slug: `first${suffix}` }));
      const secondRoot = await createCategory(prisma, categoryInput({ name: `Second${suffix}`, slug: `second${suffix}` }));
      const firstChild = await createCategory(prisma, categoryInput({ name: `First child${suffix}`, slug: `first-child${suffix}`, parentId: firstRoot.id }));
      const secondChild = await createCategory(prisma, categoryInput({ name: `Second child${suffix}`, slug: `second-child${suffix}`, parentId: secondRoot.id }));

      const results = await Promise.allSettled([
        updateCategory(prisma, movableRoot.id, categoryInput({
          name: movableRoot.name,
          slug: movableRoot.slug,
          parentId: firstChild.id,
        })),
        updateCategory(prisma, firstChild.id, categoryInput({
          name: firstChild.name,
          slug: firstChild.slug,
          parentId: secondChild.id,
        })),
      ]);

      expect(results.filter(({ status }) => status === "rejected")).toHaveLength(1);
      await expect(getCategoryAncestors(prisma, firstChild.id)).resolves.not.toHaveLength(3);
      await expect(getCategoryAncestors(prisma, movableRoot.id)).resolves.not.toHaveLength(3);
    }
  });

  it("prevents deleting a category that still has children", async () => {
    const root = await createCategory(prisma, categoryInput({ name: "AI", slug: "ai" }));
    await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id }));

    await expect(deleteCategory(prisma, root.id)).rejects.toThrow("分類仍有子分類，無法刪除");
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

  it("filters admin posts by locale and category together", async () => {
    const { author, category } = await fixture();
    const otherCategory = await createCategory(prisma, {
      locale: "zh-tw",
      name: "軟體教學",
      slug: "software-guides",
      description: "軟體文章",
    });
    await savePost(prisma, author.id, postInput(category.id, { title: "AI 文章", slug: "ai-article" }));
    await savePost(prisma, author.id, postInput(otherCategory.id, { title: "軟體文章", slug: "software-article" }));

    await expect(listAdminPosts(prisma, "zh-tw", otherCategory.id)).resolves.toMatchObject([
      { title: "軟體文章", locale: "zh-tw", categoryId: otherCategory.id },
    ]);
  });

  it("does not expose a category without published posts", async () => {
    const { category } = await fixture();
    await expect(getPublishedCategory(prisma, "zh-tw", category.slug)).resolves.toBeNull();
  });

  it("aggregates published articles and ancestors across a category subtree", async () => {
    const { author, category: root } = await fixture();
    const child = await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id }));
    const leaf = await createCategory(prisma, categoryInput({ name: "Prompt", slug: "prompt", parentId: child.id }));
    const rootPost = await savePost(prisma, author.id, postInput(root.id, { title: "Root article", slug: "root-article", status: "PUBLISHED" }), new Date("2026-09-01T00:00:00Z"));
    const childPost = await savePost(prisma, author.id, postInput(child.id, { title: "Child article", slug: "child-article", status: "PUBLISHED" }), new Date("2026-09-02T00:00:00Z"));
    const leafPost = await savePost(prisma, author.id, postInput(leaf.id, { title: "Leaf article", slug: "leaf-article", status: "PUBLISHED" }), new Date("2026-09-03T00:00:00Z"));

    const result = await getPublishedCategoryTreePage(prisma, "zh-tw", ["ai"]);
    expect(result?.children).toEqual([expect.objectContaining({ id: child.id })]);
    expect(result?.posts.map((post) => post.id)).toEqual([leafPost.id, childPost.id, rootPost.id]);
    expect(result?.ancestors).toEqual([]);

    await expect(getPublishedCategoryTreePage(prisma, "zh-tw", ["ai", "chatgpt", "prompt"]))
      .resolves.toMatchObject({ ancestors: [{ id: root.id }, { id: child.id }] });
    await expect(getPublishedCategoryTreePage(prisma, "zh-tw", ["chatgpt", "ai"]))
      .resolves.toBeNull();
  });

  it("lists ordered navigation roots and published root aggregates", async () => {
    const { author, category: root } = await fixture();
    await updateCategory(prisma, root.id, categoryInput({ name: "AI", slug: "ai", showInNavigation: true, sortOrder: 1 }));
    const child = await createCategory(prisma, categoryInput({ name: "ChatGPT", slug: "chatgpt", parentId: root.id, showInNavigation: true }));
    const leaf = await createCategory(prisma, categoryInput({ name: "Prompt", slug: "prompt", parentId: child.id }));
    await createCategory(prisma, categoryInput({ name: "軟體", slug: "software", showInNavigation: true, sortOrder: 2 }));
    await createCategory(prisma, categoryInput({ name: "隱藏", slug: "hidden", showInNavigation: false, sortOrder: 0 }));
    await savePost(prisma, author.id, postInput(leaf.id, { status: "PUBLISHED", slug: "leaf-guide" }));

    await expect(listNavigationCategories(prisma, "zh-tw")).resolves.toMatchObject([
      { name: "AI", parentId: null, showInNavigation: true, children: [{ name: "ChatGPT", children: [{ name: "Prompt" }] }] },
      { name: "軟體", parentId: null, showInNavigation: true },
    ]);
    await expect(listPublishedRootCategories(prisma, "zh-tw")).resolves.toMatchObject([
      { id: root.id, publishedPostCount: 1 },
    ]);
  });
});
