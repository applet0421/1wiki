import type { MetadataRoute } from "next";
import type { PrismaClient } from "@prisma/client";

export async function getSitemapContent(client: PrismaClient, siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    client.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    client.category.findMany({ where: { posts: { some: { status: "PUBLISHED" } } }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/ai", "/software", "/social", "/about", "/contact", "/privacy", "/terms"];
  const fixed = new Set(["ai", "software", "social"]);
  return [
    ...staticPaths.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: path ? "monthly" as const : "daily" as const, priority: path ? 0.6 : 1 })),
    ...categories.filter(({ slug }) => !fixed.has(slug)).map(({ slug, updatedAt }) => ({ url: `${siteUrl}/category/${slug}`, lastModified: updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...posts.map(({ slug, updatedAt }) => ({ url: `${siteUrl}/articles/${slug}`, lastModified: updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
