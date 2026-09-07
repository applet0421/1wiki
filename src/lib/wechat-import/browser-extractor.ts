import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import type { Route } from "playwright-core";
import { fetchWeChatAssets } from "./asset-fetcher";
import { normalizeWeChatContent } from "./normalize-content";
import { parseWeChatHtml } from "./parse-wechat-html";
import { normalizeWeChatArticleUrl, resolvePublicAddress } from "./url-policy";

type BrowserDependencies = {
  launch?: (options: Parameters<typeof chromium.launch>[0]) => Promise<any>;
  resolveAddress?: (hostname: string) => Promise<{ address: string; family: 4 | 6 }>;
  executablePath?: string;
};

function defaultChromiumPath(): string {
  if (process.env.WECHAT_CHROMIUM_PATH) return process.env.WECHAT_CHROMIUM_PATH;
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (process.platform === "darwin" && existsSync(macChrome)) return macChrome;
  return "/usr/bin/chromium";
}

export async function extractViaBrowser(sourceUrl: string, dependencies: BrowserDependencies = {}) {
  const url = normalizeWeChatArticleUrl(sourceUrl);
  const address = await (dependencies.resolveAddress || resolvePublicAddress)(url.hostname);
  const browser = await (dependencies.launch || chromium.launch)({
    executablePath: dependencies.executablePath || defaultChromiumPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", `--host-resolver-rules=MAP ${url.hostname} ${address.address},EXCLUDE localhost`],
  });
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  try {
    context = await browser.newContext({ storageState: undefined, javaScriptEnabled: true });
    const page = await context.newPage();
    await page.route("**/*", async (route: Route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      if (requestUrl.hostname !== url.hostname || !["document", "script", "stylesheet", "xhr", "fetch"].includes(request.resourceType())) return route.abort();
      return route.continue();
    });
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    for (let index = 0; index < 3; index += 1) {
      await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
      await page.waitForTimeout(200);
    }
    await page.evaluate(() => document.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((image) => { image.src = image.dataset.src || image.src; }));
    const article = parseWeChatHtml(await page.content(), url);
    const normalized = normalizeWeChatContent(article);
    const assets = await fetchWeChatAssets(normalized.imageRequests);
    return { fetchMethod: "CHROMIUM" as const, article, ...normalized, assets: assets.assets, assetFailures: assets.failures, complete: normalized.blocks.length > 0 && assets.complete };
  } finally {
    await context?.close();
    await browser.close();
  }
}
