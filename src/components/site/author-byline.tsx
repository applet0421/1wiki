import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

export function AuthorByline({ byline, fallback, locale }: { byline?: { name: string; slug: string } | null; fallback: string; locale: Locale }) {
  return byline ? <Link href={`/${locale}/authors/${byline.slug}`} rel="author">{byline.name}</Link> : <span>{fallback}</span>;
}
