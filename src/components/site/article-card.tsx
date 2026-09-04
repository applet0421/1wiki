import Link from "next/link";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
type CardPost = { slug: string; title: string; excerpt: string; publishedAt: Date | null; category: { name: string; slug: string } };
export function ArticleCard({ post, locale, dictionary }: { post: CardPost; locale: Locale; dictionary: SiteDictionary }) {
  const categoryHref = ["ai", "software", "social"].includes(post.category.slug) ? `/${locale}/${post.category.slug}` : `/${locale}/category/${post.category.slug}`;
  return <article className="article-card"><Link className="card-category" href={categoryHref}>{post.category.name}</Link><h2><Link href={`/${locale}/articles/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, { dateStyle: "medium" }).format(post.publishedAt) : ""}</time><Link href={`/${locale}/articles/${post.slug}`}>{dictionary.article.readMore}</Link></div></article>;
}
