import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({ locale, dictionary }: { locale: Locale; dictionary: SiteDictionary }) {
  return <header className="site-header"><div className="nav-shell"><Link href={`/${locale}`} className="brand-mark">1Wiki</Link><nav aria-label={dictionary.navigation.primary}><Link href={`/${locale}/ai`}>{dictionary.navigation.ai}</Link><Link href={`/${locale}/software`}>{dictionary.navigation.software}</Link><Link href={`/${locale}/social`}>{dictionary.navigation.social}</Link></nav><LanguageSwitcher locale={locale} /><Link href="/login" className="admin-link">{dictionary.navigation.admin}</Link></div></header>;
}
