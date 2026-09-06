export type SearchEvent = "publish" | "update" | "unpublish";

export function classifySearchEvent(previous: string, next: string): SearchEvent | null {
  if (next === "PUBLISHED" && previous !== "PUBLISHED") return "publish";
  if (next === "PUBLISHED" && previous === "PUBLISHED") return "update";
  if (previous === "PUBLISHED" && next !== "PUBLISHED") return "unpublish";
  return null;
}

export function buildIndexNowPayload(host: string, key: string, urls: string[]) {
  return { host, key, urlList: urls };
}

export function buildGoogleSitemapEndpoint(property: string, sitemapUrl: string) {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
}

export async function submitIndexNow(urls: string[], fetcher: typeof fetch = fetch) {
  const key = process.env.INDEXNOW_KEY?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!key || !siteUrl || urls.length === 0) return { skipped: true, count: 0 };
  const host = new URL(siteUrl).host;
  const response = await fetcher("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildIndexNowPayload(host, key, urls)) });
  if (!response.ok) throw new Error(`IndexNow 回應 ${response.status}`);
  return { skipped: false, count: urls.length };
}

async function getGoogleAccessToken(fetcher: typeof fetch) {
  const clientId = process.env.GSC_CLIENT_ID?.trim();
  const clientSecret = process.env.GSC_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GSC_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }).toString(),
  });
  if (!response.ok) throw new Error(`Google OAuth 回應 ${response.status}`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google OAuth 未回傳 access token");
  return payload.access_token;
}

export async function submitGoogleSitemap(fetcher: typeof fetch = fetch) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const property = process.env.GSC_SITE_URL?.trim() || siteUrl;
  const sitemapUrl = process.env.GSC_SITEMAP_URL?.trim() || (siteUrl ? `${siteUrl}/sitemap.xml` : "");
  if (!siteUrl || !property || !sitemapUrl) return { skipped: true };
  const accessToken = await getGoogleAccessToken(fetcher);
  if (!accessToken) return { skipped: true };
  const response = await fetcher(buildGoogleSitemapEndpoint(property, sitemapUrl), { method: "PUT", headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Google sitemap 回應 ${response.status}`);
  return { skipped: false };
}
