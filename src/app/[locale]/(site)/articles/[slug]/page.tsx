import { ArticlePanel } from "@/components/site/article-panel";
import { ArticleFeed } from "@/components/site/article-feed";
import { loadNextArticle } from "./actions";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublishedPostBySlug } from "@/lib/content/repository";
import { decodeRouteSlug } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { buildPostMetadata } from "@/lib/seo/metadata";
type Props = { params: Promise<{ locale: string; slug: string }> };
export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

const getPost = cache((locale: Locale, slug: string) => getPublishedPostBySlug(prisma, locale, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug: rawSlug } = await params;
  if (!isLocale(locale)) return {};
  const slug = decodeRouteSlug(rawSlug);
  const post = await getPost(locale, slug);
  if (!post) return {};
  const metadata = buildPostMetadata(post, locale);
  const publisher = process.env.ADSENSE_PUBLISHER_ID || "";
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && /^pub-[0-9]+$/.test(publisher);
  return enabled ? { ...metadata, other: { ...(metadata.other || {}), "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "" } } : metadata;
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  if (!isLocale(locale)) notFound();
  const slug = decodeRouteSlug(rawSlug);
  const post = await getPost(locale, slug);
  if (!post) notFound();
  const loadMore = loadNextArticle.bind(null, locale, post.slug);
  return <main className="public-main article-feed"><ArticleFeed key={`${locale}/${post.id}`} locale={locale} loadMore={loadMore}><ArticlePanel post={post} locale={locale} initial /></ArticleFeed></main>;
}
