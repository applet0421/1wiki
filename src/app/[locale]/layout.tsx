import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/config/site";
import { getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
import { prisma } from "@/lib/db/prisma";
import { resolveBrandSeo } from "@/lib/brand-seo/repository";
import "../globals.css";

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const config = getLocaleConfig(locale);
  const brand = await resolveBrandSeo(prisma);
  const seo = brand.locales[locale];
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: seo.homeTitle, template: `%s｜${brand.siteName}` },
    description: seo.homeDescription,
    manifest: "/manifest.webmanifest",
    icons: { icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: brand.assets.icon48, sizes: "48x48", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ] },
    openGraph: { type: "website", locale: config.openGraphLocale, siteName: brand.siteName, title: seo.ogTitle, description: seo.ogDescription, images: [brand.assets.defaultOg] },
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
