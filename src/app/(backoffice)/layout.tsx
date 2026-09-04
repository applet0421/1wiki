import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSiteUrl, siteConfig } from "@/lib/config/site";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: siteConfig.shortName, template: `%s｜${siteConfig.shortName}` },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function BackofficeRootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-Hant-TW"><body>{children}</body></html>;
}
