import type { MetadataRoute } from "next";
import type { PrismaClient } from "@prisma/client";
import { buildCategoryTree, getCategoryHref, type CategoryTreeItem } from "@/lib/content/category-tree";
import { getLocaleConfig, isLocale, type Locale } from "@/lib/i18n/config";

function flattenPublishedCategories(categories: CategoryTreeItem[]): CategoryTreeItem[] {
  return categories.flatMap((category) => [
    ...(category.aggregatePostCount > 0 ? [category] : []),
    ...flattenPublishedCategories(category.children),
  ]);
}

function indexCategoryLastModified(
  category: CategoryTreeItem,
  categoryUpdatedAt: Map<string, Date>,
  postUpdatedAt: Map<string, Date[]>,
  result: Map<string, Date>,
): Date {
  const dates = [
    categoryUpdatedAt.get(category.id),
    ...(postUpdatedAt.get(category.id) ?? []),
    ...category.children.map((child) =>
      indexCategoryLastModified(child, categoryUpdatedAt, postUpdatedAt, result)),
  ].filter((date): date is Date => date instanceof Date);
  const latest = dates.reduce((current, date) => date > current ? date : current);
  result.set(category.id, latest);
  return latest;
}

export async function getSitemapContent(client: PrismaClient, siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    client.post.findMany({ where: { status: "PUBLISHED" }, select: { locale: true, slug: true, categoryId: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    client.category.findMany({
      select: {
        id: true, locale: true, name: true, slug: true, description: true, parentId: true,
        sortOrder: true, showInNavigation: true, updatedAt: true,
        _count: { select: { posts: { where: { status: "PUBLISHED" } } } },
      },
    }),
  ]);
  const activeLocales = [...new Set(posts.map(({ locale }) => locale))].filter(isLocale);
  const updatedAtById = new Map(categories.map(({ id, updatedAt }) => [id, updatedAt]));
  const postUpdatedAtByCategory = new Map<string, Date[]>();
  for (const post of posts) {
    const dates = postUpdatedAtByCategory.get(post.categoryId) ?? [];
    dates.push(post.updatedAt);
    postUpdatedAtByCategory.set(post.categoryId, dates);
  }
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of activeLocales) {
    const tree = buildCategoryTree(categories
      .filter((category) => category.locale === locale)
      .map((category) => ({
        id: category.id,
        locale,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        showInNavigation: category.showInNavigation,
        directPostCount: category._count.posts,
      })));
    const publishedCategories = flattenPublishedCategories(tree);
    const categoryLastModified = new Map<string, Date>();
    for (const root of tree) {
      indexCategoryLastModified(root, updatedAtById, postUpdatedAtByCategory, categoryLastModified);
    }
    entries.push({ url: `${siteUrl}/${locale}`, changeFrequency: "daily", priority: 1 });
    entries.push(...getInfoPageEntries(siteUrl, locale));
    entries.push(...publishedCategories.map((category) => ({
      url: `${siteUrl}${getCategoryHref(locale, category.segments)}`,
      lastModified: categoryLastModified.get(category.id),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })));
    entries.push(...posts.filter((post) => post.locale === locale).map(({ slug, updatedAt }) => ({
      url: `${siteUrl}/${locale}/articles/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })));
  }

  return entries;
}

function getInfoPageEntries(siteUrl: string, locale: Locale): MetadataRoute.Sitemap {
  return getLocaleConfig(locale).publishedInfoPages.map((slug) => ({
    url: `${siteUrl}/${locale}/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}
