import { SitePageEditor } from "@/components/admin/site-page-editor";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

export default async function NewSitePage({ searchParams }: { searchParams: Promise<{ locale?: string; error?: string }> }) {
  const query = await searchParams;
  const locale = query.locale && isLocale(query.locale) ? query.locale : defaultLocale;
  return <section><p className="eyebrow">網站內容</p><h1>新增網站頁面</h1><SitePageEditor locale={locale} error={query.error} /></section>;
}
