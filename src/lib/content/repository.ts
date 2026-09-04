import { Prisma, type PrismaClient } from "@prisma/client";
import { load } from "cheerio";
import { categoryInputSchema, postInputSchema, type CategoryInput, type PostInput } from "./schema";
import { sanitizeArticleHtml } from "./sanitize";
import type { Locale } from "@/lib/i18n/config";

const protectedCategorySlugs = new Set(["ai", "software", "social"]);

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function visibleText(html: string): string {
  return load(html, null, false).root().text().replace(/\s/gu, "");
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new Error("網址代稱已被使用");
    if (error.code === "P2025") throw new Error("找不到指定資料");
  }
  throw error;
}

export async function savePost(
  client: PrismaClient,
  authorId: string,
  rawInput: PostInput,
  now = new Date(),
) {
  const input = postInputSchema.parse(rawInput);
  const contentHtml = sanitizeArticleHtml(input.contentHtml);

  if (input.status === "PUBLISHED") {
    if (!input.excerpt) throw new Error("發布文章前必須填寫摘要");
    if (!visibleText(contentHtml)) throw new Error("發布文章前必須填寫正文");
  }

  const category = await client.category.findUnique({ where: { id: input.categoryId }, select: { locale: true } });
  if (!category) throw new Error("找不到指定分類");
  if (category.locale !== input.locale) throw new Error("文章語系必須與分類一致");

  const data = {
    locale: input.locale,
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    contentHtml,
    coverImage: nullable(input.coverImage),
    status: input.status,
    categoryId: input.categoryId,
    seoTitle: nullable(input.seoTitle),
    seoDescription: nullable(input.seoDescription),
    seoKeywords: nullable(input.seoKeywords),
    canonicalUrl: nullable(input.canonicalUrl),
    ...(input.aiContentType === undefined ? {} : { aiContentType: input.aiContentType }),
    ...(input.primaryKeyword === undefined ? {} : { primaryKeyword: nullable(input.primaryKeyword) }),
    ...(input.searchIntent === undefined ? {} : { searchIntent: nullable(input.searchIntent) }),
    ...(input.aiSourceSupport === undefined ? {} : { aiSourceSupport: input.aiSourceSupport }),
    ...(input.aiNeedsVerification === undefined ? {} : { aiNeedsVerification: input.aiNeedsVerification }),
  };

  try {
    if (input.id) {
      const current = await client.post.findUnique({ where: { id: input.id } });
      if (!current) throw new Error("找不到指定文章");
      return await client.post.update({
        where: { id: input.id },
        data: {
          ...data,
          publishedAt:
            input.status === "PUBLISHED" && !current.publishedAt ? now : current.publishedAt,
        },
      });
    }

    return await client.post.create({
      data: {
        ...data,
        authorId,
        publishedAt: input.status === "PUBLISHED" ? now : null,
      },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function findAvailablePostSlug(client: PrismaClient, locale: Locale, requestedSlug: string): Promise<string> {
  const base = requestedSlug.trim();
  let candidate = base;
  let suffix = 2;
  while (await client.post.findUnique({ where: { locale_slug: { locale, slug: candidate } }, select: { id: true } })) {
    const ending = `-${suffix}`;
    candidate = `${base.slice(0, 160 - ending.length).replace(/-+$/u, "")}${ending}`;
    suffix += 1;
  }
  return candidate;
}

export async function deletePost(client: PrismaClient, postId: string) {
  try {
    return await client.post.delete({ where: { id: postId } });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function createCategory(client: PrismaClient, rawInput: CategoryInput) {
  const input = categoryInputSchema.parse(rawInput);
  try {
    return await client.category.create({ data: input });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateCategory(
  client: PrismaClient,
  categoryId: string,
  rawInput: CategoryInput,
) {
  const input = categoryInputSchema.parse(rawInput);
  const current = await client.category.findUnique({ where: { id: categoryId } });
  if (!current) throw new Error("找不到指定分類");
  if (protectedCategorySlugs.has(current.slug) && input.slug !== current.slug) {
    throw new Error("預設分類的網址代稱不可變更");
  }
  try {
    return await client.category.update({ where: { id: categoryId }, data: input });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function deleteCategory(client: PrismaClient, categoryId: string) {
  const category = await client.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { posts: true } } },
  });
  if (!category) throw new Error("找不到指定分類");
  if (protectedCategorySlugs.has(category.slug)) throw new Error("預設分類不可刪除");
  if (category._count.posts > 0) throw new Error("分類仍有文章，無法刪除");
  return client.category.delete({ where: { id: categoryId } });
}

export function listAdminPosts(client: PrismaClient, locale?: Locale, categoryId?: string) {
  return client.post.findMany({
    where: {
      ...(locale ? { locale } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true, author: { select: { displayName: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export function listCategories(client: PrismaClient, locale?: Locale) {
  return client.category.findMany({
    where: locale ? { locale } : undefined,
    include: { _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
}

export function listPublishedPosts(client: PrismaClient, locale: Locale, limit = 12) {
  return client.post.findMany({
    where: { locale, status: "PUBLISHED" },
    include: { category: true, author: { select: { displayName: true } } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export function getPublishedPostBySlug(client: PrismaClient, locale: Locale, slug: string) {
  return client.post.findFirst({
    where: { locale, slug, status: "PUBLISHED" },
    include: { category: true, author: { select: { displayName: true } } },
  });
}

export function getPublishedCategory(client: PrismaClient, locale: Locale, slug: string) {
  return client.category.findFirst({
    where: { locale, slug, posts: { some: { locale, status: "PUBLISHED" } } },
    include: {
      posts: {
        where: { locale, status: "PUBLISHED" },
        include: { category: true, author: { select: { displayName: true } } },
        orderBy: { publishedAt: "desc" },
      },
    },
  });
}

export async function hasPublishedPosts(client: PrismaClient, locale: Locale): Promise<boolean> {
  return (await client.post.count({ where: { locale, status: "PUBLISHED" } })) > 0;
}

export function listPublishedCategories(client: PrismaClient, locale: Locale) {
  return client.category.findMany({
    where: { locale, posts: { some: { locale, status: "PUBLISHED" } } },
    include: { _count: { select: { posts: { where: { locale, status: "PUBLISHED" } } } } },
    orderBy: { name: "asc" },
  });
}
