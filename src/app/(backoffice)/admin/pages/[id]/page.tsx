import { notFound } from "next/navigation";
import { SitePageEditor } from "@/components/admin/site-page-editor";
import { getSitePage, listSitePageCategoryOptions } from "@/lib/content/pages";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";

export default async function EditSitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [page, categories] = await Promise.all([getSitePage(prisma, id), listSitePageCategoryOptions(prisma)]);
  if (!page || !isLocale(page.locale)) notFound();
  return <section><p className="eyebrow">網站內容</p><h1>編輯網站頁面</h1><SitePageEditor page={page} locale={page.locale} categories={categories} error={query.error} /></section>;
}
