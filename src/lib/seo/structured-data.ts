import { siteConfig } from "@/lib/config/site";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import { resolveArticleImage } from "./image";

export type BrandIdentity = { siteName: string; alternateNames: string[]; logoUrl: string };

type ArticlePost = { title: string; slug: string; excerpt: string; contentHtml?: string; coverImage: string | null; publishedAt: Date | null; updatedAt: Date; author: { displayName: string }; byline?: { name: string; slug: string } | null };

export function buildWebsiteJsonLd(siteUrl: string, locale: Locale, brand?: BrandIdentity) {
  const hostname = new URL(siteUrl).hostname.replace(/^www\./u, "");
  return { "@context": "https://schema.org", "@type": "WebSite", name: brand?.siteName || siteConfig.shortName, alternateName: brand?.alternateNames.length ? brand.alternateNames : [hostname], url: siteUrl, inLanguage: getLocaleConfig(locale).htmlLang };
}

export function buildOrganizationJsonLd(siteUrl: string, brand?: BrandIdentity) {
  return { "@context": "https://schema.org", "@type": "Organization", name: brand?.siteName || siteConfig.shortName, url: siteUrl, logo: brand?.logoUrl || `${siteUrl}/icon.svg` };
}

export function buildBreadcrumbJsonLd(items: { name: string; href: string }[], siteUrl: string) {
  const baseUrl = siteUrl.replace(/\/$/u, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.href.startsWith("/") ? item.href : `/${item.href}`}`,
    })),
  };
}

export function buildArticleJsonLd(post: ArticlePost, siteUrl: string, locale: Locale, brand?: BrandIdentity) {
  const articleUrl = `${siteUrl}/${locale}/articles/${post.slug}`;
  return {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.excerpt,
    url: articleUrl, mainEntityOfPage: articleUrl,
    image: [resolveArticleImage({ coverImage: post.coverImage, contentHtml: post.contentHtml, siteUrl })],
    datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.byline?.name ?? post.author.displayName, ...(post.byline ? { url: `${siteUrl}/${locale}/authors/${post.byline.slug}` } : {}) }, publisher: { "@type": "Organization", name: brand?.siteName || siteConfig.shortName, logo: { "@type": "ImageObject", url: brand?.logoUrl || `${siteUrl}/icon.svg` } },
    inLanguage: getLocaleConfig(locale).htmlLang,
  };
}
