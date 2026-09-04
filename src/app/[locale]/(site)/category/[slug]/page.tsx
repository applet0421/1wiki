import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageContent } from "@/components/site/category-page";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
type Props = { params: Promise<{ locale: string; slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale, slug } = await params; if (!isLocale(locale)) return {}; const category = await prisma.category.findFirst({ where: { locale, slug, posts: { some: { status: "PUBLISHED" } } } }); if (!category) return {}; return { title: category.name, description: category.description, alternates: { canonical: `/${locale}/category/${slug}` } }; }
export default async function CategoryPage({ params }: Props) { const { locale, slug } = await params; if (!isLocale(locale) || ["ai", "software", "social"].includes(slug)) notFound(); return <CategoryPageContent slug={slug} locale={locale} dictionary={getDictionary(locale)} />; }
