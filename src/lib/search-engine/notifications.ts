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

export async function submitIndexNow(urls: string[], fetcher: typeof fetch = fetch) {
  const key = process.env.INDEXNOW_KEY?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!key || !siteUrl || urls.length === 0) return { skipped: true, count: 0 };
  const host = new URL(siteUrl).host;
  const response = await fetcher("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildIndexNowPayload(host, key, urls)) });
  if (!response.ok) throw new Error(`IndexNow 回應 ${response.status}`);
  return { skipped: false, count: urls.length };
}
