import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleFeedList } from "@/components/site/article-feed-list";
import { AdSlot } from "@/components/ads/ad-slot";
import { listPublishedPosts } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { getAdSlotConfig, getAnchorAdsConfig, getLiveAdsenseClientId, getPublicAdEnvironment } from "@/lib/adsense/config";
import { getOrCreateArticleAdSettings } from "@/lib/adsense/article-ad-settings";

// Public content is refreshed only by the invalidation outbox after an admin update.
export const revalidate = false;
type Props = { params: Promise<{ locale: string }> };

const getHomeData = cache((locale: "zh-tw" | "en" | "ja") => listPublishedPosts(prisma, locale, 12));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const posts = await getHomeData(locale);
  return { alternates: { canonical: `/${locale}` }, robots: posts.length ? undefined : { index: false, follow: true } };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);
  const [homeData, adSettings] = await Promise.all([getHomeData(locale), getOrCreateArticleAdSettings(prisma)]);
  const posts = homeData;
  const anchorConfig = getAnchorAdsConfig(adSettings, "home");
  const adEnvironment = getPublicAdEnvironment();
  const homeContext = { pathname: `/${locale}`, published: true };
  const showAds = posts.length >= 4;
  const homePlacements = ["home_inline", "home_end", "home_sidebar_desktop"] as const;
  const hasLiveSlot = showAds && homePlacements.some((placement) => getAdSlotConfig(placement, adEnvironment, homeContext)?.mode === "live");
  const clientId = hasLiveSlot || anchorConfig.enabled ? getLiveAdsenseClientId(adEnvironment, `/${locale}`) : null;
  if (!posts.length) return <><AdsenseScript clientId={clientId} enableBottomAnchor={anchorConfig.enabled} /><main className="public-main"><section className="page-hero empty-state"><p className="eyebrow">1Wiki</p><h1>{dictionary.home.emptyTitle}</h1><p>{dictionary.home.emptyDescription}</p></section></main></>;
  return <><AdsenseScript clientId={clientId} enableBottomAnchor={anchorConfig.enabled} /><main className="public-main"><section className="home-intro"><p className="eyebrow">{dictionary.home.eyebrow}</p><h1>{dictionary.home.title}</h1><p>{dictionary.home.intro}</p></section><div className="category-content-layout"><section aria-label="文章列表"><div className="section-title"><p className="eyebrow">{dictionary.home.latestEyebrow}</p><h2>{dictionary.home.latestTitle}</h2></div><ArticleFeedList posts={posts} locale={locale} dictionary={dictionary} adInterval={adSettings.categoryInlineAdInterval} inlineAdConfig={getAdSlotConfig("home_inline", adEnvironment, homeContext)} testId="latest-answers" />{showAds ? <AdSlot placement="home_end" config={getAdSlotConfig("home_end", adEnvironment, homeContext)} /> : null}</section>{showAds ? <aside className="home-sidebar" aria-label="首頁側欄廣告"><AdSlot placement="home_sidebar_desktop" config={getAdSlotConfig("home_sidebar_desktop", adEnvironment, homeContext)} /></aside> : null}</div></main></>;
}
