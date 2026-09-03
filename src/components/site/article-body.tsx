import { AdSlot } from "@/components/ads/ad-slot";
import { segmentArticle } from "@/lib/content/article-segments";
import { getAdSlotConfig, type AdEnvironment } from "@/lib/adsense/config";

export function ArticleBody({ html, pathname, adEnvironment }: { html: string; pathname: string; adEnvironment: AdEnvironment }) {
  const segments = segmentArticle(html);
  const context = { pathname, published: true };
  return <div className="article-body"><div className="article-prose public-prose" dangerouslySetInnerHTML={{ __html: segments.introHtml }} /><AdSlot placement="article_after_intro" config={getAdSlotConfig("article_after_intro", adEnvironment, context)} />{segments.bodySegments.map((segment, index) => <div key={index}><div className="article-prose public-prose" dangerouslySetInnerHTML={{ __html: segment }} />{segments.midAdAfterIndex === index ? <AdSlot placement="article_mid" config={getAdSlotConfig("article_mid", adEnvironment, context)} /> : null}</div>)}<AdSlot placement="article_end" config={getAdSlotConfig("article_end", adEnvironment, context)} /></div>;
}
