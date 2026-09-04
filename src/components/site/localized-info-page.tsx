import type { ReactNode } from "react";
import { getLocaleConfig, type InfoPageSlug, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { InfoPage } from "./info-page";

export function LocalizedInfoPage({ locale, page, children }: { locale: Locale; page: InfoPageSlug; children: ReactNode }) {
  if (getLocaleConfig(locale).publishedInfoPages.includes(page)) return children;
  const copy = getDictionary(locale).infoUnavailable;
  return <InfoPage eyebrow="1Wiki" title={copy.title} intro={copy.description}><span /></InfoPage>;
}
