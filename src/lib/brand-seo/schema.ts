import { z } from "zod";
import { isLocale, supportedLocales, type Locale } from "@/lib/i18n/config";

const limits = { siteName: 80, alternateName: 120, title: 120, description: 320 } as const;
type LocaleSeoInput = { homeTitle: string | null; homeDescription: string | null; ogTitle: string | null; ogDescription: string | null };
export type BrandSeoInput = { siteName: string; alternateName: string | null; assets: { icon48SourceUrl: string | null; logoSourceUrl: string | null; defaultOgSourceUrl: string | null }; locales: Record<Locale, LocaleSeoInput> };

function text(value: unknown, maximum: number): string | null {
  const parsed = z.string().max(maximum).parse(typeof value === "string" ? value : "").trim();
  return parsed || null;
}

function assetUrl(value: unknown): string | null {
  const raw = text(value, 2_000);
  if (!raw) return null;
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  try {
    const url = new URL(raw);
    if (!base || url.origin !== new URL(base).origin || !url.pathname.startsWith("/uploads/brand/")) throw new Error();
    return url.toString();
  } catch { throw new Error("品牌圖片網址不正確"); }
}

export function parseBrandSeoForm(value: unknown): BrandSeoInput {
  const raw = z.object({ siteName: z.unknown(), alternateName: z.unknown().optional(), assets: z.object({ icon48SourceUrl: z.unknown().optional(), logoSourceUrl: z.unknown().optional(), defaultOgSourceUrl: z.unknown().optional() }), locales: z.record(z.string(), z.object({ homeTitle: z.unknown().optional(), homeDescription: z.unknown().optional(), ogTitle: z.unknown().optional(), ogDescription: z.unknown().optional() })) }).parse(value);
  const siteName = text(raw.siteName, limits.siteName);
  if (!siteName) throw new Error("網站名稱不可空白");
  const locales = Object.fromEntries(supportedLocales.map((locale) => {
    const item = raw.locales[locale] ?? {};
    return [locale, { homeTitle: text(item.homeTitle, limits.title), homeDescription: text(item.homeDescription, limits.description), ogTitle: text(item.ogTitle, limits.title), ogDescription: text(item.ogDescription, limits.description) }];
  })) as Record<Locale, LocaleSeoInput>;
  for (const locale of Object.keys(raw.locales)) if (!isLocale(locale)) continue;
  return { siteName, alternateName: text(raw.alternateName, limits.alternateName), assets: { icon48SourceUrl: assetUrl(raw.assets.icon48SourceUrl), logoSourceUrl: assetUrl(raw.assets.logoSourceUrl), defaultOgSourceUrl: assetUrl(raw.assets.defaultOgSourceUrl) }, locales };
}
