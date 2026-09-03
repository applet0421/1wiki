import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
export default function manifest(): MetadataRoute.Manifest { return { name: siteConfig.name, short_name: siteConfig.shortName, description: siteConfig.description, start_url: "/", display: "standalone", background_color: "#f8fafc", theme_color: "#2764e7", lang: siteConfig.locale, icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] }; }
