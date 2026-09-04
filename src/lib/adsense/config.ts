export type AdPlacement = "article_after_intro" | "article_mid" | "article_end" | "sidebar_desktop" | "feed_inline";
export type AdEnvironment = Record<string, string | undefined>;
export type AdContext = { pathname: string; published: boolean };
export type AdSlotConfig = { mode: "live"; placement: AdPlacement; shape: "banner" | "rectangle"; clientId: string; slotId: string } | { mode: "preview"; placement: AdPlacement; shape: "banner" | "rectangle" };

const slotKeys: Record<AdPlacement, string> = {
  article_after_intro: "NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO", article_mid: "NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID",
  article_end: "NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END", sidebar_desktop: "NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP",
  feed_inline: "NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE",
};
const shapes: Record<AdPlacement, "banner" | "rectangle"> = { article_after_intro: "banner", article_mid: "rectangle", article_end: "banner", sidebar_desktop: "rectangle", feed_inline: "banner" };
const articlePathPattern = new RegExp(`^/(?:${supportedLocales.join("|")})/articles/[^/]+$`);

export function getPublicAdEnvironment(): AdEnvironment {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ADSENSE_ENABLED: process.env.NEXT_PUBLIC_ADSENSE_ENABLED,
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO,
    NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID,
    NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END,
    NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP,
    NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE,
  };
}

export function getAdSlotConfig(placement: AdPlacement, env: AdEnvironment, context: AdContext): AdSlotConfig | null {
  const isArticle = articlePathPattern.test(context.pathname);
  if (placement === "feed_inline" || !isArticle || !context.published) return null;
  const shape = shapes[placement];
  const clientId = env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";
  const slotId = env[slotKeys[placement]]?.trim() || "";
  if (env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && clientId && slotId) return { mode: "live", placement, shape, clientId, slotId };
  if (env.NODE_ENV === "development") return { mode: "preview", placement, shape };
  return null;
}

export function getLiveAdsenseClientId(env: AdEnvironment, pathname: string): string | null {
  if (env.NEXT_PUBLIC_ADSENSE_ENABLED !== "true" || !articlePathPattern.test(pathname)) return null;
  const id = env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() || "";
  return id || null;
}
import { supportedLocales } from "@/lib/i18n/config";
