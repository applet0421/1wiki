import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard } from "@/components/site/article-card";
import { listPublishedPosts, listPublishedRootCategories } from "@/lib/content/repository";
import { getCategoryHref } from "@/lib/content/category-tree";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

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
  const [posts, categories] = await getHomeData(locale);
  if (!posts.length) return <main className="public-main"><section className="page-hero empty-state"><p className="eyebrow">1Wiki</p><h1>{dictionary.home.emptyTitle}</h1><p>{dictionary.home.emptyDescription}</p></section></main>;
  return <main className="public-main"><section className="home-hero"><div><p className="eyebrow">{dictionary.home.eyebrow}</p><h1>{dictionary.home.title}</h1><p>{dictionary.home.intro}</p></div></section><section><div className="section-title"><p className="eyebrow">{dictionary.home.exploreEyebrow}</p><h2>{dictionary.home.exploreTitle}</h2></div><div className="category-grid">{categories.map((category, index) => <Link href={getCategoryHref(locale, [category.slug])} className="category-card" key={category.id}><span>{String(index + 1).padStart(2, "0")}</span><h3>{category.name}</h3><p>{category.description}</p><strong>{dictionary.home.viewCategory}</strong></Link>)}</div></section><section><div className="section-title"><p className="eyebrow">{dictionary.home.latestEyebrow}</p><h2>{dictionary.home.latestTitle}</h2></div><div className="article-list" data-testid="latest-answers">{posts.map((post) => <ArticleCard key={post.id} post={post} locale={locale} dictionary={dictionary} />)}</div></section></main>;
}
