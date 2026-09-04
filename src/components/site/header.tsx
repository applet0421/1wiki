import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryHref } from "@/lib/content/category-tree";
import { LanguageSwitcher } from "./language-switcher";

type NavigationCategory = { id: string; name: string; segments: string[] };

export function SiteHeader({ locale, dictionary, categories }: { locale: Locale; dictionary: SiteDictionary; categories: NavigationCategory[] }) {
  return <header className="site-header"><div className="nav-shell"><Link href={`/${locale}`} className="brand-mark">1Wiki</Link><nav aria-label={dictionary.navigation.primary}>{categories.map((category) => <Link href={getCategoryHref(locale, category.segments)} key={category.id}>{category.name}</Link>)}</nav><LanguageSwitcher locale={locale} /><Link href="/login" className="admin-link">{dictionary.navigation.admin}</Link></div></header>;
}
