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
type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
const getPost = cache((slug: string) => getPublishedPostBySlug(prisma, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const post = await getPost(slug);
  if (!post) return {};
  const metadata = buildPostMetadata(post);
  const publisher = process.env.ADSENSE_PUBLISHER_ID || "";
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && /^pub-[0-9]+$/.test(publisher);
  return enabled ? { ...metadata, other: { ...(metadata.other || {}), "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "" } } : metadata;
}

export default async function ArticlePage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = decodeRouteSlug(rawSlug);
  const post = await getPost(slug);
  if (!post) notFound();
  const pathname = `/articles/${post.slug}`;
  const adEnvironment = getPublicAdEnvironment();
  const context = { pathname, published: true };
  const hasLiveSlot = (["article_after_intro", "article_mid", "article_end", "sidebar_desktop"] as const).some((placement) => getAdSlotConfig(placement, adEnvironment, context)?.mode === "live");
  const clientId = hasLiveSlot ? getLiveAdsenseClientId(adEnvironment, pathname) : null;
  return <><AdsenseScript clientId={clientId} /><main className="public-main article-layout"><article className="article-page"><JsonLd value={buildArticleJsonLd(post, getSiteUrl())} /><Breadcrumbs categoryName={post.category.name} categorySlug={post.category.slug} title={post.title} /><header className="article-header"><p className="eyebrow">{post.category.name}</p><h1>{post.title}</h1><p className="article-excerpt">{post.excerpt}</p><div className="article-meta"><span>{post.author.displayName}</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(post.publishedAt) : ""}</time>{post.updatedAt > (post.publishedAt || post.createdAt) ? <span>更新於 {new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(post.updatedAt)}</span> : null}</div></header><ArticleBody html={post.contentHtml} pathname={pathname} adEnvironment={adEnvironment} /><aside className="related-box"><strong>繼續探索 {post.category.name}</strong><p>查看更多同類型的使用教學與疑難解答。</p><Link href={["ai", "software", "social"].includes(post.category.slug) ? `/${post.category.slug}` : `/category/${post.category.slug}`}>前往分類 →</Link></aside></article><aside className="article-sidebar"><div className="desktop-ad-only"><AdSlot placement="sidebar_desktop" config={getAdSlotConfig("sidebar_desktop", adEnvironment, context)} /></div><div className="sidebar-note"><span>1Wiki 閱讀原則</span><strong>一篇文章，解決一個問題。</strong><p>保留這篇教學，需要時快速回來查看。</p></div></aside></main></>;
}
