import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { defaultLocale, getLocaleConfig } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function manifest(): MetadataRoute.Manifest {
  const dictionary = getDictionary(defaultLocale);
  return { name: dictionary.site.name, short_name: siteConfig.shortName, description: dictionary.site.description, start_url: `/${defaultLocale}`, display: "standalone", background_color: "#f8fafc", theme_color: "#2764e7", lang: getLocaleConfig(defaultLocale).htmlLang, icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
