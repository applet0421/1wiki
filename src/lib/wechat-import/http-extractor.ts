import { fetchWeChatAssets } from "./asset-fetcher";
import { normalizeWeChatContent } from "./normalize-content";
import { parseWeChatHtml } from "./parse-wechat-html";
import { normalizeWeChatArticleUrl, safeHttpsGet } from "./url-policy";

export async function extractViaHttp(sourceUrl: string, options: { request?: typeof safeHttpsGet } = {}) {
  const url = normalizeWeChatArticleUrl(sourceUrl);
  const request = options.request || safeHttpsGet;
  const response = await request(url);
  if (response.status < 200 || response.status >= 300) throw new Error("SOURCE_ACCESS_DENIED");
  const article = parseWeChatHtml(response.body.toString("utf8"), response.finalUrl);
  const normalized = normalizeWeChatContent(article);
  const assets = await fetchWeChatAssets(normalized.imageRequests, { request });
  return { fetchMethod: "HTTP" as const, article, ...normalized, assets: assets.assets, assetFailures: assets.failures, complete: normalized.blocks.length > 0 && assets.complete };
}
