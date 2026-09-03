import type { Metadata } from "next";
import { getSiteUrl, siteConfig } from "@/lib/config/site";

type MetadataPost = { title: string; slug: string; excerpt: string; coverImage: string | null; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null };

export function buildPostMetadata(post: MetadataPost): Metadata {
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const canonical = post.canonicalUrl || `${getSiteUrl()}/articles/${post.slug}`;
  const images = [post.coverImage || "/og-default.svg"];
  return {
    title, description, keywords: post.seoKeywords?.split(",").map((value) => value.trim()).filter(Boolean),
    alternates: { canonical },
    openGraph: { type: "article", locale: "zh_TW", siteName: siteConfig.shortName, title, description, url: canonical, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
