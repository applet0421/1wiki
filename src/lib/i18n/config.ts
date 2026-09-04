export const supportedLocales = ["zh-tw", "en", "ja"] as const;

export type Locale = (typeof supportedLocales)[number];
export type InfoPageSlug = "about" | "contact" | "privacy" | "terms";

export const defaultLocale: Locale = "zh-tw";

export type LocaleConfig = {
  label: string;
  htmlLang: string;
  openGraphLocale: string;
  dateLocale: string;
  publishedInfoPages: readonly InfoPageSlug[];
};

const localeConfigs = {
  "zh-tw": {
    label: "繁體中文",
    htmlLang: "zh-Hant-TW",
    openGraphLocale: "zh_TW",
    dateLocale: "zh-TW",
    publishedInfoPages: ["about", "contact", "privacy", "terms"],
  },
  en: {
    label: "English",
    htmlLang: "en",
    openGraphLocale: "en_US",
    dateLocale: "en",
    publishedInfoPages: [],
  },
  ja: {
    label: "日本語",
    htmlLang: "ja",
    openGraphLocale: "ja_JP",
    dateLocale: "ja-JP",
    publishedInfoPages: [],
  },
} satisfies Record<Locale, LocaleConfig>;

export function isLocale(value: string): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}

export function getLocaleConfig(locale: Locale): LocaleConfig {
  return localeConfigs[locale];
}
