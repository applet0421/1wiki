import { siteConfig } from "@/lib/config/site";

type ArticlePost = { title: string; slug: string; excerpt: string; coverImage: string | null; publishedAt: Date | null; updatedAt: Date; author: { displayName: string } };

export function buildWebsiteJsonLd(siteUrl: string) {
  return { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, alternateName: siteConfig.shortName, url: siteUrl, inLanguage: siteConfig.locale };
}

export function buildOrganizationJsonLd(siteUrl: string) {
  return { "@context": "https://schema.org", "@type": "Organization", name: siteConfig.shortName, url: siteUrl, logo: `${siteUrl}/icon.svg` };
}

export function buildArticleJsonLd(post: ArticlePost, siteUrl: string) {
  return {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.excerpt,
    url: `${siteUrl}/articles/${post.slug}`, mainEntityOfPage: `${siteUrl}/articles/${post.slug}`,
    image: [post.coverImage || `${siteUrl}/og-default.svg`],
    datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.displayName }, publisher: { "@type": "Organization", name: siteConfig.shortName, logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` } },
    inLanguage: siteConfig.locale,
  };
}
