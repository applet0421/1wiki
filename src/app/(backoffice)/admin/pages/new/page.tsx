import { SitePageEditor } from "@/components/admin/site-page-editor";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { listSitePageCategoryOptions } from "@/lib/content/pages";
import { prisma } from "@/lib/db/prisma";

export default async function NewSitePage({ searchParams }: { searchParams: Promise<{ locale?: string; error?: string }> }) {
  const query = await searchParams;
  const locale = query.locale && isLocale(query.locale) ? query.locale : defaultLocale;
  const categories = await listSitePageCategoryOptions(prisma);
  return <section><p className="eyebrow">網站內容</p><h1>新增網站頁面</h1><SitePageEditor locale={locale} categories={categories} error={query.error} /></section>;
}
