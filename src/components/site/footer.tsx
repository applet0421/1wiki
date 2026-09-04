import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";

export function SiteFooter({ locale, dictionary }: { locale: Locale; dictionary: SiteDictionary }) {
  return <footer className="site-footer"><div className="footer-shell"><div><strong>1Wiki</strong><p>{dictionary.footer.description}</p></div><nav aria-label={dictionary.footer.information}><Link href={`/${locale}/about`}>{dictionary.footer.about}</Link><Link href={`/${locale}/contact`}>{dictionary.footer.contact}</Link><Link href={`/${locale}/privacy`}>{dictionary.footer.privacy}</Link><Link href={`/${locale}/terms`}>{dictionary.footer.terms}</Link></nav><small>© {new Date().getFullYear()} 1Wiki</small></div></footer>;
}
