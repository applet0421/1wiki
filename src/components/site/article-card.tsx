import Link from "next/link";
import { getLocaleConfig, type Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryHref } from "@/lib/content/category-tree";

type CardCategory = { name: string; slug: string; parent?: CardCategory | null };
type CardPost = { slug: string; title: string; excerpt: string; publishedAt: Date | null; coverImage?: string | null; category: CardCategory };

function categorySegments(category: CardCategory): string[] {
  return category.parent
    ? [...categorySegments(category.parent), category.slug]
    : [category.slug];
}

export function ArticleCard({ post, locale, dictionary }: { post: CardPost; locale: Locale; dictionary: SiteDictionary }) {
  const categoryHref = getCategoryHref(locale, categorySegments(post.category));
  const hasCoverImage = Boolean(post.coverImage);
  return <article className={`article-card${hasCoverImage ? " has-cover" : ""}`}>
    {hasCoverImage ? <Link className="article-card-cover" href={`/${locale}/articles/${post.slug}`} aria-label={post.title}><img src={post.coverImage!} alt={`${post.title} 首圖`} loading="lazy" width="640" height="360" /></Link> : null}
    <div className="article-card-content"><Link className="card-category" href={categoryHref}>{post.category.name}</Link><h2><Link href={`/${locale}/articles/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt ? new Intl.DateTimeFormat(getLocaleConfig(locale).dateLocale, { dateStyle: "medium" }).format(post.publishedAt) : ""}</time><Link href={`/${locale}/articles/${post.slug}`}>{dictionary.article.readMore}</Link></div></div>
  </article>;
}
