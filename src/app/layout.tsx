import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSiteUrl, siteConfig } from "@/lib/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.name,
    template: `%s｜${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  openGraph: { type: "website", locale: "zh_TW", siteName: siteConfig.shortName, title: siteConfig.name, description: siteConfig.description, images: ["/og-default.svg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>{children}</body>
    </html>
  );
}
