import type { MetadataRoute } from "next";
import { defaultLocale, getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { prisma } from "@/lib/db/prisma";
import { resolveBrandSeo } from "@/lib/brand-seo/repository";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const dictionary = getDictionary(defaultLocale);
  const brand = await resolveBrandSeo(prisma);
  const seo = brand.locales[defaultLocale];
  return { name: seo.homeTitle, short_name: brand.siteName, description: seo.homeDescription, start_url: `/${defaultLocale}`, display: "standalone", background_color: "#f8fafc", theme_color: "#2764e7", lang: getLocaleConfig(defaultLocale).htmlLang, icons: [
    { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { src: brand.assets.icon48, sizes: "48x48", type: "image/png" },
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
  ] };
}
