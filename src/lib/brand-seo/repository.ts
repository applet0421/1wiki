import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, supportedLocales, type Locale } from "@/lib/i18n/config";
import { brandAssetPaths } from "./constants";

type BrandRow = { siteName: string; alternateName: string | null; icon48SourceUrl: string | null; logoSourceUrl: string | null; defaultOgSourceUrl: string | null } | null;
type LocaleRow = { locale: string; homeTitle: string | null; homeDescription: string | null; ogTitle: string | null; ogDescription: string | null };
type BrandSeoClient = { brandSeoSettings: { findUnique: (args: { where: { id: string } }) => Promise<BrandRow> }; localeSeoSettings: { findMany: () => Promise<LocaleRow[]> } };

type LocaleSeo = { homeTitle: string; homeDescription: string; ogTitle: string; ogDescription: string };

export type ResolvedBrandSeo = {
  siteName: string;
  alternateNames: string[];
  assets: typeof brandAssetPaths;
  locales: Record<Locale, LocaleSeo>;
};

function defaults(): ResolvedBrandSeo {
  return {
    siteName: "1Wiki",
    alternateNames: ["1wiki.org"],
    assets: brandAssetPaths,
    locales: Object.fromEntries(supportedLocales.map((locale) => {
      const site = getDictionary(locale).site;
      return [locale, { homeTitle: site.name, homeDescription: site.description, ogTitle: site.name, ogDescription: site.description }];
    })) as Record<Locale, LocaleSeo>,
  };
}

export async function resolveBrandSeo(client: BrandSeoClient): Promise<ResolvedBrandSeo> {
  const fallback = defaults();
  try {
    const [brand, rows] = await Promise.all([client.brandSeoSettings.findUnique({ where: { id: "default" } }), client.localeSeoSettings.findMany()]);
    const locales = { ...fallback.locales };
    for (const row of rows) {
      if (!isLocale(row.locale)) continue;
      locales[row.locale] = {
        homeTitle: row.homeTitle || locales[row.locale].homeTitle,
        homeDescription: row.homeDescription || locales[row.locale].homeDescription,
        ogTitle: row.ogTitle || row.homeTitle || locales[row.locale].ogTitle,
        ogDescription: row.ogDescription || row.homeDescription || locales[row.locale].ogDescription,
      };
    }
    return { ...fallback, siteName: brand?.siteName || fallback.siteName, alternateNames: brand?.alternateName ? [brand.alternateName] : fallback.alternateNames, locales };
  } catch (error) {
    console.error("brand-seo read failed", error);
    return fallback;
  }
}
