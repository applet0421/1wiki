import { fetchWeChatAssets } from "./asset-fetcher";
import { normalizeWeChatContent } from "./normalize-content";
import { parseWeChatHtml } from "./parse-wechat-html";
import { normalizeWeChatArticleUrl, safeHttpsGet } from "./url-policy";

export async function extractViaHttp(sourceUrl: string, options: { request?: typeof safeHttpsGet } = {}) {
  const url = normalizeWeChatArticleUrl(sourceUrl);
  const transport = options.request || safeHttpsGet;
  const request: typeof safeHttpsGet = (target, requestOptions = {}) => transport(target, {
    ...requestOptions,
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36", ...requestOptions.headers },
  });
  const response = await request(url, { maxBytes: 8 * 1024 * 1024 });
  if (response.status < 200 || response.status >= 300) throw new Error("SOURCE_ACCESS_DENIED");
  const article = parseWeChatHtml(response.body.toString("utf8"), response.finalUrl);
  const normalized = normalizeWeChatContent(article);
  const assets = await fetchWeChatAssets(normalized.imageRequests, { request });
  return { fetchMethod: "HTTP" as const, article, ...normalized, assets: assets.assets, assetFailures: assets.failures, complete: normalized.blocks.length > 0 && assets.complete };
}
