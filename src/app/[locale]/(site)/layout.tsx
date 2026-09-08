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
import { AnalyticsTracker } from "@/components/site/analytics-tracker";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { resolveBrandSeo } from "@/lib/brand-seo/repository";

export const revalidate = 60;

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const siteUrl = getSiteUrl();
  const dictionary = getDictionary(locale);
  const [categories, brand] = await Promise.all([listNavigationCategories(prisma, locale), resolveBrandSeo(prisma)]);
  const analytics = getAnalyticsConfig();
  const identity = { siteName: brand.siteName, alternateNames: brand.alternateNames, logoUrl: `${siteUrl}${brand.assets.logo}` };
  return <>{analytics.enabled ? <AnalyticsTracker measurementId={analytics.measurementId} /> : null}<JsonLd value={buildWebsiteJsonLd(siteUrl, locale, identity)} /><JsonLd value={buildOrganizationJsonLd(siteUrl, identity)} /><SiteHeader locale={locale} dictionary={dictionary} categories={categories.map((category) => ({
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
