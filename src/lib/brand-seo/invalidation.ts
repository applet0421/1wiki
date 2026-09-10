import { supportedLocales } from "@/lib/i18n/config";

export function brandSeoSharedPublicPaths(): string[] {
  return [
    "/manifest.webmanifest",
    "/brand/icon-48.png",
    "/brand/logo",
    "/brand/og-default",
  ];
}

export function brandSeoInvalidationPaths(): string[] {
  return [
    ...supportedLocales.map((locale) => `/${locale}`),
    ...brandSeoSharedPublicPaths(),
    "/sitemap.xml",
    "/admin/brand-seo",
  ];
}
