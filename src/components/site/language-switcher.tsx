import Link from "next/link";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <nav className="language-switcher" aria-label={getDictionary(locale).navigation.language}>
      {supportedLocales.map((value) => (
        <Link key={value} href={`/${value}`} aria-current={value === locale ? "page" : undefined}>
          {getLocaleConfig(value).label}
        </Link>
      ))}
    </nav>
  );
}
