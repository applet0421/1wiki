import { notFound } from "next/navigation";
import Link from "next/link";
import { AuthorForm } from "@/components/admin/author-form";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";

export default async function EditAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author || !isLocale(author.locale)) notFound();
  return <section className="admin-grid"><div className="section-heading"><p className="eyebrow">作者庫</p><h1>編輯作者</h1><Link href={`/${author.locale}/authors/${author.slug}`} target="_blank" rel="noopener noreferrer">查看作者頁 ↗</Link></div><AuthorForm author={author} locale={author.locale} /></section>;
}
