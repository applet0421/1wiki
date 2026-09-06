export function publicCacheHeaders(maxAgeSeconds: number): Record<string, string> {
  const maxAge = Math.max(0, Math.floor(maxAgeSeconds));
  return {
    "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=300`,
  };
}
