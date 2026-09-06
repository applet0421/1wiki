import { AuthorByline } from "./author-byline";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { CategoryBreadcrumbs } from "@/components/site/category-breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { ArticleBody } from "@/components/site/article-body";
import { AdSlot } from "@/components/ads/ad-slot";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { getAdSlotConfig, getLiveAdsenseClientId, getPublicAdEnvironment } from "@/lib/adsense/config";
import { getSiteUrl } from "@/lib/config/site";
import type { getPublishedPostBySlug } from "@/lib/content/repository";
import { getCategoryHref } from "@/lib/content/category-tree";
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type ArticlePost = NonNullable<Awaited<ReturnType<typeof getPublishedPostBySlug>>>;

export async function ArticlePanel({ post, locale, initial = false }: { post: ArticlePost; locale: Locale; initial?: boolean }) {
  const pathname = `/${locale}/articles/${post.slug}`;
  const dictionary = getDictionary(locale);
  const dateLocale = getLocaleConfig(locale).dateLocale;
  const adEnvironment = getPublicAdEnvironment();
  const context = { pathname, published: true };
  const hasLiveSlot = (["article_after_intro", "article_mid", "article_end", "sidebar_desktop", "sidebar_desktop_sticky"] as const).some((placement) => getAdSlotConfig(placement, adEnvironment, context)?.mode === "live");
  const clientId = hasLiveSlot ? getLiveAdsenseClientId(adEnvironment, pathname) : null;
  const ancestors = [
    ...(post.category.parent?.parent ? [post.category.parent.parent] : []),
    ...(post.category.parent ? [post.category.parent] : []),
  ];
  const relatedPosts = await prisma.post.findMany({
    where: {
      locale,
      categoryId: post.categoryId,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      id: { not: post.id },
    },
    select: { id: true, slug: true, title: true },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 3,
  });
  const breadcrumbCategories = [...ancestors, post.category];
  const breadcrumbItems = [
    { name: dictionary.article.home, href: `/${locale}` },
    ...breadcrumbCategories.map((category, index) => ({
      name: category.name,
      href: getCategoryHref(locale, breadcrumbCategories.slice(0, index + 1).map(({ slug }) => slug)),
    })),
    { name: post.title, href: pathname },
  ];
  return <><AdsenseScript clientId={clientId} /><section className="article-layout" aria-label={post.title}><article className="article-page">{initial ? <><JsonLd value={buildArticleJsonLd(post, getSiteUrl(), locale)} /><JsonLd value={buildBreadcrumbJsonLd(breadcrumbItems, getSiteUrl())} /></> : null}<CategoryBreadcrumbs ancestors={ancestors} current={post.category} locale={locale} /><header className="article-header"><p className="eyebrow">{post.category.name}</p>{initial ? <h1>{post.title}</h1> : <h2 className="article-title"><Link href={pathname}>{post.title}</Link></h2>}<p className="article-excerpt">{post.excerpt}</p><div className="article-meta"><AuthorByline byline={post.byline} fallback={post.author.displayName} locale={locale} /><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "long" }).format(post.publishedAt) : ""}</time>{post.updatedAt > (post.publishedAt || post.createdAt) ? <span>{dictionary.article.updated} {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(post.updatedAt)}</span> : null}</div></header><ArticleBody html={post.contentHtml} pathname={pathname} adEnvironment={adEnvironment} />{relatedPosts.length > 0 ? <aside className="related-box" aria-label={dictionary.article.relatedTitle}>
  <h2>{dictionary.article.relatedTitle}</h2>
  <ul className="related-articles">
    {relatedPosts.map((related) => <li key={related.id}>
      <Link href={`/${locale}/articles/${related.slug}`}><span>{related.title}</span><span aria-hidden="true">→</span></Link>
    </li>)}
  </ul>
</aside> : null}</article><aside className="article-sidebar"><div className="desktop-ad-only"><AdSlot placement="sidebar_desktop" config={getAdSlotConfig("sidebar_desktop", adEnvironment, context)} /></div><div className="desktop-ad-only sidebar-ad-sticky"><AdSlot placement="sidebar_desktop_sticky" config={getAdSlotConfig("sidebar_desktop_sticky", adEnvironment, context)} /></div></aside></section></>;
}
