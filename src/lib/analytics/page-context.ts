import { isLocale } from "@/lib/i18n/config";

export type AnalyticsPageContext = { locale: string; pageType: "home" | "category" | "article" | "author" | "static"; contentSlug: string; categorySlug: string; rootCategorySlug: string };

export function classifyPagePath(pathname: string): AnalyticsPageContext | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const locale = parts[0];
  if (!locale || !isLocale(locale)) return null;
  if (parts.length === 1) return { locale, pageType: "home", contentSlug: "", categorySlug: "", rootCategorySlug: "" };
  if (parts[1] === "articles" && parts[2]) return { locale, pageType: "article", contentSlug: parts[2], categorySlug: "", rootCategorySlug: "" };
  if (parts[1] === "category" && parts[2]) {
    const slug = parts.at(-1) || "";
    return { locale, pageType: "category", contentSlug: slug, categorySlug: slug, rootCategorySlug: parts[2] };
  }
  if (parts[1] === "authors" && parts[2]) return { locale, pageType: "author", contentSlug: parts[2], categorySlug: "", rootCategorySlug: "" };
  return { locale, pageType: "static", contentSlug: parts.at(-1) || "", categorySlug: "", rootCategorySlug: "" };
}
