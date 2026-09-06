import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { getAdSlotConfig, getLiveAdsenseClientId, getPublicAdEnvironment } from "@/lib/adsense/config";
import { getCategoryHref } from "@/lib/content/category-tree";
import { getSiteUrl } from "@/lib/config/site";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";
import { CategoryArticleList } from "./category-article-list";
import { CategoryBreadcrumbs } from "./category-breadcrumbs";
import { JsonLd } from "./json-ld";

type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type CategoryChild = PublicCategory & { aggregatePostCount: number };

type CategoryPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  category: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
      parent?: { name: string; slug: string; parent?: null } | null;
    } | null;
  };
};

type CategoryPageData = {
  category: PublicCategory;
  ancestors: PublicCategory[];
  children: CategoryChild[];
  posts: CategoryPost[];
  sitePages: { id: string; title: string; slug: string; excerpt: string }[];
};

export function CategoryPageContent({
  data,
  locale,
  dictionary,
}: {
  data: CategoryPageData;
  locale: Locale;
  dictionary: SiteDictionary;
}) {
  const segments = [...data.ancestors.map(({ slug }) => slug), data.category.slug];
  const categories = [...data.ancestors, data.category];
  const breadcrumbItems = [
    { name: dictionary.article.home, href: `/${locale}` },
    ...categories.map((category, index) => ({
      name: category.name,
      href: getCategoryHref(locale, categories.slice(0, index + 1).map(({ slug }) => slug)),
    })),
  ];
  const pathname = getCategoryHref(locale, segments);
  const adEnvironment = getPublicAdEnvironment();
  const adContext = { pathname, published: true };
  const showAds = data.posts.length >= 4;
  const adInterval = Math.max(1, Number.parseInt(adEnvironment.NEXT_PUBLIC_CATEGORY_INLINE_AD_INTERVAL || "10", 10) || 10);
  const categoryPlacements = ["category_after_intro", "category_inline", "category_end", "category_sidebar_desktop"] as const;
  const hasLiveSlot = showAds && categoryPlacements.some((placement) => getAdSlotConfig(placement, adEnvironment, adContext)?.mode === "live");
  const clientId = hasLiveSlot ? getLiveAdsenseClientId(adEnvironment, pathname) : null;

  return (
    <main className="public-main">
      <AdsenseScript clientId={clientId} />
      <JsonLd value={buildBreadcrumbJsonLd(breadcrumbItems, getSiteUrl())} />
      <CategoryBreadcrumbs locale={locale} ancestors={data.ancestors} current={data.category} />
      <header className="page-hero">
        <p className="eyebrow">{dictionary.category.eyebrow}</p>
        <h1>{data.category.name}</h1>
        <p>{data.category.description}</p>
      </header>
      {showAds ? <AdSlot placement="category_after_intro" config={getAdSlotConfig("category_after_intro", adEnvironment, adContext)} /> : null}
      {data.sitePages.length > 0 ? <section className="category-site-pages" aria-label="About"><ul className="category-site-pages-list">{data.sitePages.map((page) => <li className="category-site-page-item" key={page.id}><Link href={`/${locale}/${page.slug}`}><span className="card-category">About</span><strong>{page.title}</strong>{page.excerpt ? <span className="category-site-page-excerpt">{page.excerpt}</span> : null}<span className="category-site-page-cta">查看頁面 <span aria-hidden="true">→</span></span></Link></li>)}</ul></section> : null}
      <div className="category-content-layout">
        <section aria-label="文章列表">
          <CategoryArticleList initialPosts={data.posts} locale={locale} dictionary={dictionary} path={segments.join("/")} adInterval={adInterval} inlineAdConfig={getAdSlotConfig("category_inline", adEnvironment, adContext)} />
          {showAds ? <AdSlot placement="category_end" config={getAdSlotConfig("category_end", adEnvironment, adContext)} /> : null}
        </section>
        {showAds ? <aside className="category-sidebar" aria-label="分類側欄廣告"><AdSlot placement="category_sidebar_desktop" config={getAdSlotConfig("category_sidebar_desktop", adEnvironment, adContext)} /></aside> : null}
      </div>
    </main>
  );
}
