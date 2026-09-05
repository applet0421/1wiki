import { AuthorForm } from "@/components/admin/author-form";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

export default async function NewAuthorPage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const query = await searchParams;
  const locale = query.locale && isLocale(query.locale) ? query.locale : defaultLocale;
  return <section className="admin-grid"><div className="section-heading"><p className="eyebrow">作者庫</p><h1>新增作者</h1></div><AuthorForm locale={locale} /></section>;
}
