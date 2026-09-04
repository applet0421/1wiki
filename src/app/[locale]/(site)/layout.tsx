import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSiteUrl } from "@/lib/config/site";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/site/json-ld";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const siteUrl = getSiteUrl();
  const dictionary = getDictionary(locale);
  return <><JsonLd value={buildWebsiteJsonLd(siteUrl, locale)} /><JsonLd value={buildOrganizationJsonLd(siteUrl)} /><SiteHeader locale={locale} dictionary={dictionary} />{children}<SiteFooter locale={locale} dictionary={dictionary} /></>;
}
