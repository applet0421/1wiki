import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageContent } from "@/components/site/category-page";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; const value = isLocale(locale) ? locale : "zh-tw"; return { title: getDictionary(value).navigation.social, alternates: { canonical: `/${locale}/social` } }; }
export default async function SocialPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <CategoryPageContent slug="social" locale={locale} dictionary={getDictionary(locale)} />; }
