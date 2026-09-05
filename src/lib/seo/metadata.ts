import type { Metadata } from "next";
import { getSiteUrl, siteConfig } from "@/lib/config/site";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import { resolveArticleImage } from "./image";

type MetadataPost = { title: string; slug: string; excerpt: string; contentHtml?: string; coverImage: string | null; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null; byline?: { name: string; slug: string } | null };

export function buildPostMetadata(post: MetadataPost, locale: Locale): Metadata {
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonical = post.canonicalUrl || `${getSiteUrl()}/${locale}/articles/${post.slug}`;
  const images = [resolveArticleImage({ coverImage: post.coverImage, contentHtml: post.contentHtml, siteUrl: getSiteUrl() })];
  return {
    title, description, keywords: post.seoKeywords?.split(",").map((value) => value.trim()).filter(Boolean),
    alternates: { canonical },
    ...(post.byline ? { authors: [{ name: post.byline.name, url: `${getSiteUrl()}/${locale}/authors/${post.byline.slug}` }] } : {}),
    openGraph: { type: "article", locale: getLocaleConfig(locale).openGraphLocale, siteName: siteConfig.shortName, title, description, url: canonical, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
