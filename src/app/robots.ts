import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config/site";
export default function robots(): MetadataRoute.Robots { const siteUrl = getSiteUrl(); return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/login", "/change-password"] }, sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl }; }
