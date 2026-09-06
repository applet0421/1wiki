import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { load } from "cheerio";
import { ArticleCard } from "@/components/site/article-card";
import { JsonLd } from "@/components/site/json-ld";
import { getPublicAuthor } from "@/lib/content/authors";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { getSiteUrl } from "@/lib/config/site";
import { prisma } from "@/lib/db/prisma";
import { isLocale, getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; slug: string }> };
const getAuthor = cache(async (locale: string, slug: string) => {
  if (!isLocale(locale)) notFound();
  const author = await getPublicAuthor(prisma, locale, slug);
  if (!author) notFound();
  return author;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getAuthor(locale, slug);
  const description = load(author.contentHtml, null, false).root().text().replace(/\s+/gu, " ").trim().slice(0, 170) || author.name;
  return { title: author.name, description, alternates: { canonical: `${getSiteUrl()}/${locale}/authors/${author.slug}` } };
}

export default async function AuthorPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const author = await getAuthor(locale, slug);
  const dictionary = getDictionary(locale);
  const posts = await prisma.post.findMany({
    where: { bylineId: author.id, locale, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    select: {
      id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true,
      category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } } } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 24,
  });
  return <main className="public-main author-profile">
    <JsonLd value={{ "@context": "https://schema.org", "@type": "ProfilePage", url: `${getSiteUrl()}/${locale}/authors/${author.slug}`, inLanguage: getLocaleConfig(locale).htmlLang, dateModified: author.updatedAt.toISOString(), mainEntity: { "@type": "Person", name: author.name, url: `${getSiteUrl()}/${locale}/authors/${author.slug}` } }} />
    <article className="author-profile-intro"><header><p className="eyebrow">{dictionary.author.eyebrow}</p><h1>{author.name}</h1></header>{author.contentHtml ? <div className="article-prose public-prose" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(author.contentHtml) }} /> : null}</article>
    <section aria-label={dictionary.author.articles}><h2>{dictionary.author.articles}</h2>{posts.length ? <div className="article-grid">{posts.map((post) => <ArticleCard key={post.id} post={post} locale={locale} dictionary={dictionary} />)}</div> : <p className="muted">{dictionary.author.empty}</p>}</section>
  </main>;
}
