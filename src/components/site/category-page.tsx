import { notFound } from "next/navigation";
import { getPublishedCategory } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { ArticleCard } from "./article-card";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export async function CategoryPageContent({ slug, locale, dictionary }: { slug: string; locale: Locale; dictionary: SiteDictionary }) {
  const category = await getPublishedCategory(prisma, locale, slug);
  if (!category) notFound();
  return <main className="public-main"><header className="page-hero"><p className="eyebrow">{dictionary.category.eyebrow}</p><h1>{category.name}</h1><p>{category.description}</p></header><div className="article-grid">{category.posts.map((post) => <ArticleCard key={post.id} post={post} locale={locale} dictionary={dictionary} />)}</div></main>;
}
