import type { MetadataRoute } from "next";
import type { PrismaClient } from "@prisma/client";
import { getLocaleConfig, isLocale, type Locale } from "@/lib/i18n/config";

export async function getSitemapContent(client: PrismaClient, siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    client.post.findMany({ where: { status: "PUBLISHED" }, select: { locale: true, slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    client.category.findMany({ where: { posts: { some: { status: "PUBLISHED" } } }, select: { locale: true, slug: true, updatedAt: true } }),
  ]);
  const fixed = new Set(["ai", "software", "social"]);
  const activeLocales = [...new Set(posts.map(({ locale }) => locale))].filter(isLocale);
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of activeLocales) {
    const localeCategories = categories.filter((category) => category.locale === locale);
    entries.push({ url: `${siteUrl}/${locale}`, changeFrequency: "daily", priority: 1 });
    entries.push(...getInfoPageEntries(siteUrl, locale));
    entries.push(...localeCategories.map(({ slug, updatedAt }) => ({
      url: fixed.has(slug) ? `${siteUrl}/${locale}/${slug}` : `${siteUrl}/${locale}/category/${slug}`,
      lastModified: updatedAt,
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
