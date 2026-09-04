import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CategoryPageContent } from "@/components/site/category-page";
import { getCategoryHref } from "@/lib/content/category-tree";
import { getPublishedCategoryTreePage } from "@/lib/content/repository";
import { decodeRouteSlug } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string; slugs: string[] }> };

export const dynamic = "force-dynamic";

const getCategoryPage = cache((locale: Locale, slugs: string[]) =>
  getPublishedCategoryTreePage(prisma, locale, slugs));

function validSlugs(slugs: string[]): boolean {
  return slugs.length >= 1 && slugs.length <= 3;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slugs: rawSlugs } = await params;
  if (!isLocale(locale) || !validSlugs(rawSlugs)) return {};
  const slugs = rawSlugs.map(decodeRouteSlug);
  const data = await getCategoryPage(locale, slugs);
  if (!data) return {};
  return {
    title: data.category.name,
    description: data.category.description,
    alternates: { canonical: getCategoryHref(locale, slugs) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slugs: rawSlugs } = await params;
  if (!isLocale(locale) || !validSlugs(rawSlugs)) notFound();
  const slugs = rawSlugs.map(decodeRouteSlug);
  const data = await getCategoryPage(locale, slugs);
  if (!data) notFound();
  return <CategoryPageContent data={data} locale={locale} dictionary={getDictionary(locale)} />;
}
