import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { ArticleBody } from "@/components/site/article-body";
import { AdSlot } from "@/components/ads/ad-slot";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { getAdSlotConfig, getLiveAdsenseClientId, getPublicAdEnvironment } from "@/lib/adsense/config";
import { getSiteUrl } from "@/lib/config/site";
import { getPublishedPostBySlug } from "@/lib/content/repository";
import { decodeRouteSlug } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { buildPostMetadata } from "@/lib/seo/metadata";
import { buildArticleJsonLd } from "@/lib/seo/structured-data";
import { getLocaleConfig, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamic = "force-dynamic";
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
  const pathname = `/${locale}/articles/${post.slug}`;
  const dictionary = getDictionary(locale);
  const dateLocale = getLocaleConfig(locale).dateLocale;
  const adEnvironment = getPublicAdEnvironment();
  const context = { pathname, published: true };
  const hasLiveSlot = (["article_after_intro", "article_mid", "article_end", "sidebar_desktop"] as const).some((placement) => getAdSlotConfig(placement, adEnvironment, context)?.mode === "live");
  const clientId = hasLiveSlot ? getLiveAdsenseClientId(adEnvironment, pathname) : null;
  const categoryHref = ["ai", "software", "social"].includes(post.category.slug) ? `/${locale}/${post.category.slug}` : `/${locale}/category/${post.category.slug}`;
  return <><AdsenseScript clientId={clientId} /><main className="public-main article-layout"><article className="article-page"><JsonLd value={buildArticleJsonLd(post, getSiteUrl(), locale)} /><Breadcrumbs categoryName={post.category.name} categorySlug={post.category.slug} title={post.title} locale={locale} dictionary={dictionary} /><header className="article-header"><p className="eyebrow">{post.category.name}</p><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><div className="article-meta"><span>{post.author.displayName}</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "long" }).format(post.publishedAt) : ""}</time>{post.updatedAt > (post.publishedAt || post.createdAt) ? <span>{dictionary.article.updated} {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(post.updatedAt)}</span> : null}</div></header><ArticleBody html={post.contentHtml} pathname={pathname} adEnvironment={adEnvironment} /><aside className="related-box"><strong>{dictionary.article.explore} {post.category.name}</strong><p>{post.category.description}</p><Link href={categoryHref}>{dictionary.article.categoryLink}</Link></aside></article><aside className="article-sidebar"><div className="desktop-ad-only"><AdSlot placement="sidebar_desktop" config={getAdSlotConfig("sidebar_desktop", adEnvironment, context)} /></div></aside></main></>;
}
