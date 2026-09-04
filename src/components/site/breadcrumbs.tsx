import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
export function Breadcrumbs({ categoryName, categorySlug, title, locale, dictionary }: { categoryName: string; categorySlug: string; title: string; locale: Locale; dictionary: SiteDictionary }) {
  const categoryHref = ["ai", "software", "social"].includes(categorySlug) ? `/${locale}/${categorySlug}` : `/${locale}/category/${categorySlug}`;
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href={`/${locale}`}>{dictionary.article.home}</Link><span aria-hidden>／</span><Link href={categoryHref}>{categoryName}</Link><span aria-hidden>／</span><span aria-current="page">{title}</span></nav>;
}
