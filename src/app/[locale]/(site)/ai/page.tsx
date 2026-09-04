import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageContent } from "@/components/site/category-page";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; return { title: "AI", alternates: { canonical: `/${locale}/ai` } }; }
export default async function AIPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); return <CategoryPageContent slug="ai" locale={locale} dictionary={getDictionary(locale)} />; }
