import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard } from "@/components/site/article-card";
import { listPublishedPosts, listPublishedRootCategories } from "@/lib/content/repository";
import { getCategoryHref } from "@/lib/content/category-tree";
import { prisma } from "@/lib/db/prisma";
import { getLocaleConfig, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { getAnchorAdsConfig, getLiveAdsenseClientId, getPublicAdEnvironment } from "@/lib/adsense/config";
import { getOrCreateArticleAdSettings } from "@/lib/adsense/article-ad-settings";

export const revalidate = 60;
type Props = { params: Promise<{ locale: string }> };

const getHomeData = cache((locale: "zh-tw" | "en" | "ja") => Promise.all([
  listPublishedPosts(prisma, locale, 12),
  listPublishedRootCategories(prisma, locale),
]));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [posts] = await getHomeData(locale);
  return { alternates: { canonical: `/${locale}` }, robots: posts.length ? undefined : { index: false, follow: true } };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const [homeData, adSettings] = await Promise.all([getHomeData(locale), getOrCreateArticleAdSettings(prisma)]);
  const [posts, categories] = homeData;
  const anchorConfig = getAnchorAdsConfig(adSettings, "home");
  const clientId = anchorConfig.enabled ? getLiveAdsenseClientId(getPublicAdEnvironment(), `/${locale}`) : null;
  if (!posts.length) return <><AdsenseScript clientId={clientId} enableBottomAnchor={anchorConfig.enabled} /><main className="public-main"><section className="page-hero empty-state"><p className="eyebrow">1Wiki</p><h1>{dictionary.home.emptyTitle}</h1><p>{dictionary.home.emptyDescription}</p></section></main></>;
  const [featuredPost, ...latestPosts] = posts;
  const featuredCategorySegments = featuredPost.category.parent ? [featuredPost.category.parent.slug, featuredPost.category.slug] : [featuredPost.category.slug];
  const featuredHref = `/${locale}/articles/${featuredPost.slug}`;
  return <><AdsenseScript clientId={clientId} enableBottomAnchor={anchorConfig.enabled} /><main className="public-main"><section className="home-hero"><div><p className="eyebrow">{dictionary.home.eyebrow}</p><h1>{dictionary.home.title}</h1><p>{dictionary.home.intro}</p></div></section><section data-testid="home-featured-guide"><div className="section-title"><p className="eyebrow">{dictionary.home.featuredEyebrow}</p><h2>{dictionary.home.featuredTitle}</h2></div><article className={`article-card${featuredPost.coverImage ? " has-cover" : ""}`}>{featuredPost.coverImage ? <Link className="article-card-cover" href={featuredHref} aria-label={featuredPost.title}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={featuredPost.coverImage} alt="" loading="eager" width="640" height="480" /></Link> : null}<div className="article-card-content"><Link className="card-category" href={getCategoryHref(locale, featuredCategorySegments)}>{featuredPost.category.name}</Link><h2 className="article-card-title"><Link className="article-card-title-link" href={featuredHref} style={{ fontSize: "inherit", fontWeight: "inherit", lineHeight: "inherit" }}>{featuredPost.title}</Link></h2><p className="article-card-excerpt">{featuredPost.excerpt}</p><div className="article-card-meta"><time dateTime={featuredPost.publishedAt?.toISOString()}>{featuredPost.publishedAt ? new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, { dateStyle: "medium" }).format(featuredPost.publishedAt) : ""}</time><Link href={featuredHref}>{dictionary.article.readMore}</Link></div></div></article></section><section><div className="section-title"><p className="eyebrow">{dictionary.home.latestEyebrow}</p><h2>{dictionary.home.latestTitle}</h2></div><div className="article-list" data-testid="latest-answers">{latestPosts.map((post) => <ArticleCard key={post.id} post={post} locale={locale} dictionary={dictionary} />)}</div></section><section data-testid="home-topic-shortcuts"><div className="section-title"><p className="eyebrow">{dictionary.home.topicShortcutsEyebrow}</p><h2>{dictionary.home.topicShortcutsTitle}</h2></div><div className="category-grid">{categories.map((category, index) => <Link href={getCategoryHref(locale, [category.slug])} className="category-card" key={category.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{category.name}</h3><p>{category.description}</p><strong>{dictionary.home.viewCategory}</strong></Link>)}</div></section></main></>;
}
