import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageContent } from "@/components/site/category-page";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; const value = isLocale(locale) ? locale : "zh-tw"; return { title: getDictionary(value).navigation.software, alternates: { canonical: `/${locale}/software` } }; }
export default async function SoftwarePage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <CategoryPageContent slug="software" locale={locale} dictionary={getDictionary(locale)} />; }
