import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/config/site";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/site/json-ld";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const siteUrl = getSiteUrl();
  return <><JsonLd value={buildWebsiteJsonLd(siteUrl)} /><JsonLd value={buildOrganizationJsonLd(siteUrl)} /><SiteHeader />{children}<SiteFooter /></>;
}
