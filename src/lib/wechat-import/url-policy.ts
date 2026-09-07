import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";

const ARTICLE_HOST = "mp.weixin.qq.com";
const IMAGE_HOSTS = new Set(["mmbiz.qpic.cn", "mmbiz.qlogo.cn"]);
const MAX_URL_LENGTH = 2_048;

export type PublicAddress = { address: string; family: 4 | 6 };
type Lookup = (hostname: string) => Promise<PublicAddress[]>;

function invalidArticle(): never {
  throw new Error("只接受公開微信文章連結");
}

export function normalizeWeChatArticleUrl(raw: string): URL {
  if (raw.trim().length > MAX_URL_LENGTH) invalidArticle();
  let url: URL;
  try { url = new URL(raw.trim()); } catch { invalidArticle(); }
  const isShortPath = url.pathname.startsWith("/s/") && url.pathname.length > 3;
  const isQueryPath = url.pathname === "/s" && url.searchParams.size > 0;
  if (url.protocol !== "https:" || url.hostname !== ARTICLE_HOST || url.username || url.password || url.port || (!isShortPath && !isQueryPath)) invalidArticle();
  url.hash = "";
  return url;
}

export function assertAllowedWeChatImageUrl(raw: string | URL): URL {
  let url: URL;
  try { url = raw instanceof URL ? new URL(raw.toString()) : new URL(raw); } catch { throw new Error("圖片來源不被允許"); }
  if (url.protocol !== "https:" || !IMAGE_HOSTS.has(url.hostname) || url.username || url.password || url.port) throw new Error("圖片來源不被允許");
  return url;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  const mappedV4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u);
  if (mappedV4) return isPrivateIpv4(mappedV4[1]);
  return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || /^fe[89ab]/u.test(lower) || lower.startsWith("ff");
}

export function isPublicAddress({ address, family }: PublicAddress): boolean {
  return family === 4 ? !isPrivateIpv4(address) : !isPrivateIpv6(address);
}

export async function resolvePublicAddress(hostname: string, lookup: Lookup = async (host) => dnsLookup(host, { all: true, verbatim: true }) as Promise<PublicAddress[]>): Promise<PublicAddress> {
  const answers = await lookup(hostname);
  const publicAnswer = answers.find((answer) => (answer.family === 4 || answer.family === 6) && isPublicAddress(answer));
  if (!publicAnswer) throw new Error("來源必須解析到公開網路位址");
  return publicAnswer;
}

export function classifyWeChatRedirect(url: URL): "SOURCE_VERIFICATION_REQUIRED" | "SOURCE_LOGIN_REQUIRED" | null {
  if (url.pathname.includes("captcha") || url.pathname.includes("verify")) return "SOURCE_VERIFICATION_REQUIRED";
  if (url.pathname.includes("login")) return "SOURCE_LOGIN_REQUIRED";
  return null;
}

type SafeGetOptions = {
  maxBytes?: number;
  maxRedirects?: number;
  validateUrl?: (url: URL) => URL;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export async function safeHttpsGet(rawUrl: URL | string, options: SafeGetOptions = {}): Promise<{ finalUrl: URL; status: number; headers: Headers; body: Buffer }> {
  const validateUrl = options.validateUrl || ((url: URL) => normalizeWeChatArticleUrl(url.toString()));
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function get(url: URL, redirects: number): Promise<{ finalUrl: URL; status: number; headers: Headers; body: Buffer }> {
    const allowedUrl = validateUrl(url);
    const resolved = await resolvePublicAddress(allowedUrl.hostname);
    return new Promise((resolve, reject) => {
      const req = httpsRequest(allowedUrl, {
        method: "GET",
        headers: options.headers,
        servername: allowedUrl.hostname,
        lookup: (_host, lookupOptions, callback) => {
          if (lookupOptions.all) return callback(null, [{ address: resolved.address, family: resolved.family }]);
          return callback(null, resolved.address, resolved.family);
        },
      }, (response) => {
        const status = response.statusCode || 0;
        const headerEntries: [string, string][] = [];
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) headerEntries.push([key, Array.isArray(value) ? value.join(", ") : String(value)]);
        }
        const headers = new Headers(headerEntries);
        const location = response.headers.location;
        if ([301, 302, 303, 307, 308].includes(status) && location) {
          response.resume();
          if (redirects >= maxRedirects) return reject(new Error("重新導向次數超過上限"));
          let next: URL;
          try { next = new URL(location, allowedUrl); } catch { return reject(new Error("重新導向網址無效")); }
          const redirectError = classifyWeChatRedirect(next);
          if (redirectError) return reject(new Error(redirectError));
          return void get(next, redirects + 1).then(resolve, reject);
        }
        const length = Number(response.headers["content-length"] || 0);
        if (Number.isFinite(length) && length > maxBytes) {
          response.destroy();
          return reject(new Error("回應內容超過上限"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) response.destroy(new Error("回應內容超過上限"));
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => resolve({ finalUrl: allowedUrl, status, headers, body: Buffer.concat(chunks) }));
      });
      req.setTimeout(timeoutMs, () => req.destroy(new Error("來源請求逾時")));
      req.on("error", reject);
      req.end();
    });
  }

  return get(typeof rawUrl === "string" ? new URL(rawUrl) : rawUrl, 0);
}
