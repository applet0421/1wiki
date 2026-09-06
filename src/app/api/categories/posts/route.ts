import { getPublishedCategoryPosts } from "@/lib/content/repository";
import { decodeRouteSlug } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { publicCacheHeaders } from "@/lib/http/public-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  const path = url.searchParams.get("path") || "";
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "10", 10) || 10));
  const slugs = path.split("/").filter(Boolean).map(decodeRouteSlug);
  if (!locale || !isLocale(locale) || slugs.length < 1 || slugs.length > 3) return Response.json({ error: "無效分類" }, { status: 400 });
  const result = await getPublishedCategoryPosts(prisma, locale as Locale, slugs, offset, limit);
  if (!result) return Response.json({ error: "找不到分類" }, { status: 404 });
  return Response.json(
    { posts: result.posts, hasMore: offset + result.posts.length < result.total },
    { headers: publicCacheHeaders(30) },
  );
}
