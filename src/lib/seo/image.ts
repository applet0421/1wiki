const absoluteImageUrl = (value: string, siteUrl: string): string | null => {
  try {
    const url = new URL(value, siteUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch { return null; }
};

export function extractFirstBodyImage(contentHtml: string, siteUrl: string): string | null {
  const matches = contentHtml.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/giu);
  for (const match of matches) {
    const image = absoluteImageUrl(match[1], siteUrl);
    if (image) return image;
  }
  return null;
}

export function resolveArticleImage(input: { coverImage?: string | null; contentHtml?: string; siteUrl: string; defaultPath?: string }): string {
  const siteUrl = /^https?:\/\//iu.test(input.siteUrl) ? input.siteUrl : "http://localhost:3000";
  const cover = input.coverImage ? absoluteImageUrl(input.coverImage, siteUrl) : null;
  if (cover) return cover;
  return extractFirstBodyImage(input.contentHtml || "", siteUrl)
    || new URL(input.defaultPath || "/og-default.svg", siteUrl).toString();
}
