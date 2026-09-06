function hostnameFromRequest(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  return (forwardedHost || request.headers.get("host") || new URL(request.url).host).split(":", 1)[0].toLowerCase();
}

export function canonicalHostRedirect(request: Request) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredSiteUrl) return null;

  let canonicalUrl: URL;
  try {
    canonicalUrl = new URL(configuredSiteUrl);
  } catch {
    return null;
  }

  const canonicalHost = canonicalUrl.hostname.toLowerCase();
  const nonCanonicalHost = canonicalHost.startsWith("www.") ? canonicalHost.slice(4) : null;
  if (!nonCanonicalHost || hostnameFromRequest(request) !== nonCanonicalHost) return null;

  const url = new URL(request.url);
  url.protocol = canonicalUrl.protocol;
  url.hostname = canonicalHost;
  url.port = "";
  return url.toString();
}
