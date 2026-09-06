import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublishedSitePage } from "@/lib/content/pages";
import { prisma } from "@/lib/db/prisma";
import { getSiteUrl } from "@/lib/config/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { SitePageView } from "@/components/site/site-page-view";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const revalidate = 300;
export const dynamicParams = true;
const getPage = cache((locale: Locale, slug: string) => getPublishedSitePage(prisma, locale, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) return {};
  const page = await getPage(rawLocale, slug);
  if (!page) return {};
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.excerpt;
  const canonical = page.canonicalUrl || `${getSiteUrl()}/${rawLocale}/${page.slug}`;
  return { title, description, keywords: page.seoKeywords?.split(",").map((value) => value.trim()).filter(Boolean), alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function SitePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const page = await getPage(rawLocale, slug);
  if (!page) notFound();
  return <SitePageView title={page.title} excerpt={page.excerpt} contentHtml={page.contentHtml} />;
}
