import { Prisma, type Category, type PrismaClient } from "@prisma/client";
import { load } from "cheerio";
import { categoryInputSchema, postInputSchema, type CategoryInput, type PostInput } from "./schema";
import { sanitizeArticleHtml } from "./sanitize";
import type { Locale } from "@/lib/i18n/config";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

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
  return client.$transaction(async (transaction) => {
    await validateCategoryPlacement(transaction, input);
    try {
      return await transaction.category.create({
        data: { ...input, showInNavigation: input.parentId ? false : input.showInNavigation },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  });
}

export async function updateCategory(
  client: PrismaClient,
  categoryId: string,
  rawInput: CategoryInput,
) {
  const input = categoryInputSchema.parse(rawInput);
  return client.$transaction(async (transaction) => {
    const current = await transaction.category.findUnique({ where: { id: categoryId } });
    if (!current) throw new Error("找不到指定分類");
    if (current.locale !== input.locale) throw new Error("分類語系不可變更");
    await validateCategoryPlacement(transaction, input, categoryId);
    try {
      return await transaction.category.update({
        where: { id: categoryId },
        data: { ...input, showInNavigation: input.parentId ? false : input.showInNavigation },
      });
    } catch (error) {
      mapPrismaError(error);
    }
  });
}

export async function deleteCategory(client: PrismaClient, categoryId: string) {
  const category = await client.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { posts: true, children: true } } },
  });
  if (!category) throw new Error("找不到指定分類");
  if (category._count.posts > 0) throw new Error("分類仍有文章，無法刪除");
  if (category._count.children > 0) throw new Error("分類仍有子分類，無法刪除");
  return client.category.delete({ where: { id: categoryId } });
}

export async function getCategoryAncestors(client: DatabaseClient, categoryId: string): Promise<Category[]> {
  const ancestors: Category[] = [];
  const visited = new Set<string>([categoryId]);
  const initial = await client.category.findUnique({ where: { id: categoryId } });
  if (!initial) throw new Error("找不到指定分類");
  let current: Category = initial;

  while (current.parentId) {
    if (visited.has(current.parentId)) throw new Error("分類資料包含無效的父子關係");
    visited.add(current.parentId);
    const parent: Category | null = await client.category.findUnique({ where: { id: current.parentId } });
    if (!parent || parent.locale !== current.locale) throw new Error("分類資料包含無效的父子關係");
    ancestors.unshift(parent);
    current = parent;
    if (ancestors.length > 2) throw new Error("分類資料包含無效的父子關係");
  }

  return ancestors;
}

export async function getCategoryDescendantIds(client: DatabaseClient, categoryId: string): Promise<string[]> {
  const category = await client.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new Error("找不到指定分類");

  const ids = [categoryId];
  let frontier = [categoryId];
  for (let level = 0; level < 2 && frontier.length > 0; level += 1) {
    const children = await client.category.findMany({
      where: { parentId: { in: frontier } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true },
    });
    frontier = children.map(({ id }) => id);
    ids.push(...frontier);
  }

  const deeperChild = frontier.length > 0
    ? await client.category.findFirst({ where: { parentId: { in: frontier } }, select: { id: true } })
    : null;
  if (deeperChild) throw new Error("分類資料包含無效的父子關係");
  return ids;
}

export async function resolveCategoryPath(
  client: DatabaseClient,
  locale: Locale,
  slugs: string[],
): Promise<Category | null> {
  if (slugs.length < 1 || slugs.length > 3) return null;
  let parentId: string | null = null;
  let category: Category | null = null;

  for (const slug of slugs) {
    category = await client.category.findFirst({ where: { locale, slug, parentId } });
    if (!category) return null;
    parentId = category.id;
  }

  return category;
}

async function validateCategoryPlacement(
  client: Prisma.TransactionClient,
  input: ReturnType<typeof categoryInputSchema.parse>,
  categoryId?: string,
): Promise<void> {
  if (!input.parentId) return;
  if (input.parentId === categoryId) throw new Error("分類不能移到自己或自己的子分類下");

  const parent = await client.category.findUnique({ where: { id: input.parentId } });
  if (!parent) throw new Error("找不到指定的上層分類");
  if (parent.locale !== input.locale) throw new Error("上層分類必須與目前分類使用相同語系");

  const parentAncestors = await getCategoryAncestors(client, parent.id);
  if (categoryId && (parent.id === categoryId || parentAncestors.some(({ id }) => id === categoryId))) {
    throw new Error("分類不能移到自己或自己的子分類下");
  }

  const targetDepth = parentAncestors.length + 2;
  if (targetDepth > 3) throw new Error(categoryId ? "移動後的分類層級會超過三級" : "分類最多只能有三級");

  if (categoryId) {
    const descendantIds = await getCategoryDescendantIds(client, categoryId);
    const descendants = await client.category.findMany({
      where: { id: { in: descendantIds.slice(1) } },
      select: { id: true, parentId: true },
    });
    const childIds = new Set(descendants.filter(({ parentId }) => parentId === categoryId).map(({ id }) => id));
    const hasGrandchild = descendants.some(({ parentId }) => parentId && childIds.has(parentId));
    const subtreeHeight = hasGrandchild ? 3 : childIds.size > 0 ? 2 : 1;
    if (targetDepth + subtreeHeight - 1 > 3) throw new Error("移動後的分類層級會超過三級");
  }
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
