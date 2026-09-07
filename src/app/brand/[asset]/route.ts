import { getBrandAssetSource } from "@/lib/brand-seo/repository";

const assets = {
  "icon-48.png": { kind: "icon48", fallback: "/icon-48.png" },
  logo: { kind: "logo", fallback: "/icon.svg" },
  "og-default": { kind: "defaultOg", fallback: "/og-default.svg" },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const asset = assets[(await params).asset as keyof typeof assets];
  if (!asset) return new Response(null, { status: 404 });
  const source = await getBrandAssetSource(asset.kind);
  if (!source) return Response.redirect(new URL(asset.fallback, request.url), 307);
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!response.ok || !response.body) throw new Error("brand asset unavailable");
    return new Response(response.body, { headers: { "content-type": response.headers.get("content-type") || "application/octet-stream", "cache-control": "public, max-age=3600" } });
  } catch { return Response.redirect(new URL(asset.fallback, request.url), 307); }
}
