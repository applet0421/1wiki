import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getPublishedSitePage } from "@/lib/content/pages";
import { prisma } from "@/lib/db/prisma";
import { getLocaleConfig, type InfoPageSlug, type Locale } from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/config/site";
import { SitePageView } from "./site-page-view";

export async function ManagedInfoPage({ locale, page, children }: { locale: Locale; page: InfoPageSlug; children: ReactNode }) {
  const managed = await getPublishedSitePage(prisma, locale, page);
  return managed ? <SitePageView title={managed.title} excerpt={managed.excerpt} contentHtml={managed.contentHtml} /> : children;
}

export async function getManagedInfoPageMetadata(locale: string, page: InfoPageSlug, fallbackTitle: string): Promise<Metadata> {
  const canonical = `/${locale}/${page}`;
  if (!isLocaleValue(locale)) return { title: fallbackTitle, alternates: { canonical } };
  const managed = await getPublishedSitePage(prisma, locale, page);
  if (!managed) return { title: fallbackTitle, alternates: { canonical }, robots: getLocaleConfig(locale).publishedInfoPages.includes(page) ? undefined : { index: false, follow: true } };
  const title = managed.seoTitle || managed.title;
  const description = managed.seoDescription || managed.excerpt;
  return { title, description, keywords: managed.seoKeywords?.split(",").map((value) => value.trim()).filter(Boolean), alternates: { canonical: managed.canonicalUrl || `${getSiteUrl()}${canonical}` } };
}

function isLocaleValue(value: string): value is Locale {
  return value === "zh-tw" || value === "en" || value === "ja";
}
