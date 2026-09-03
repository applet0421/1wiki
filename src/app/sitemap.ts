import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config/site";
import { prisma } from "@/lib/db/prisma";
import { getSitemapContent } from "./sitemap-data";
export default function sitemap(): Promise<MetadataRoute.Sitemap> { return getSitemapContent(prisma, getSiteUrl()); }
