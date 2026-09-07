import { supportedLocales } from "@/lib/i18n/config";

export function brandSeoInvalidationPaths(): string[] {
  return [
    ...supportedLocales.map((locale) => `/${locale}`),
    "/manifest.webmanifest",
    "/brand/icon-48.png",
    "/brand/logo",
    "/brand/og-default",
    "/sitemap.xml",
    "/admin/brand-seo",
  ];
}
