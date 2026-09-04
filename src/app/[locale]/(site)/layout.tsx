import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/config/site";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/site/json-ld";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { listNavigationCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const siteUrl = getSiteUrl();
  const dictionary = getDictionary(locale);
  const categories = await listNavigationCategories(prisma, locale);
  return <><JsonLd value={buildWebsiteJsonLd(siteUrl, locale)} /><JsonLd value={buildOrganizationJsonLd(siteUrl)} /><SiteHeader locale={locale} dictionary={dictionary} categories={categories.map((category) => ({
    id: category.id,
    name: category.name,
    segments: [category.slug],
    children: category.children.map((child) => ({
      id: child.id,
      name: child.name,
      segments: [category.slug, child.slug],
      children: child.children.map((leaf) => ({
        id: leaf.id,
        name: leaf.name,
        segments: [category.slug, child.slug, leaf.slug],
        children: [],
      })),
    })),
  }))} />{children}<SiteFooter locale={locale} dictionary={dictionary} /></>;
}
