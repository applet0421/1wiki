import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSiteUrl, siteConfig } from "@/lib/config/site";
import { getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import "../globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);
  const config = getLocaleConfig(locale);
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: dictionary.site.name, template: `%s｜${siteConfig.shortName}` },
    description: dictionary.site.description,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg" },
    openGraph: { type: "website", locale: config.openGraphLocale, siteName: siteConfig.shortName, title: dictionary.site.name, description: dictionary.site.description, images: ["/og-default.svg"] },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default async function LocaleRootLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={getLocaleConfig(locale).htmlLang}><body>{children}</body></html>;
}
