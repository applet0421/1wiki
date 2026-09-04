import { siteConfig } from "@/lib/config/site";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type ArticlePost = { title: string; slug: string; excerpt: string; coverImage: string | null; publishedAt: Date | null; updatedAt: Date; author: { displayName: string } };

export function buildWebsiteJsonLd(siteUrl: string, locale: Locale) {
  return { "@context": "https://schema.org", "@type": "WebSite", name: getDictionary(locale).site.name, alternateName: siteConfig.shortName, url: `${siteUrl}/${locale}`, inLanguage: getLocaleConfig(locale).htmlLang };
}

export function buildOrganizationJsonLd(siteUrl: string) {
  return { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.shortName, url: siteUrl, logo: `${siteUrl}/icon.svg` };
}

export function buildArticleJsonLd(post: ArticlePost, siteUrl: string, locale: Locale) {
  const articleUrl = `${siteUrl}/${locale}/articles/${post.slug}`;
  return {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.excerpt,
    url: articleUrl, mainEntityOfPage: articleUrl,
    image: [post.coverImage || `${siteUrl}/og-default.svg`],
    datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.displayName }, publisher: { "@type": "Organization", name: siteConfig.shortName, logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` } },
    inLanguage: getLocaleConfig(locale).htmlLang,
  };
}
