import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageContent } from "@/components/site/category-page";
import { prisma } from "@/lib/db/prisma";
type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const category = await prisma.category.findUnique({ where: { slug } }); if (!category) return {}; return { title: category.name, description: category.description, alternates: { canonical: `/category/${slug}` } }; }
export default async function CategoryPage({ params }: Props) { const { slug } = await params; if (["ai", "software", "social"].includes(slug)) notFound(); return <CategoryPageContent slug={slug} />; }
