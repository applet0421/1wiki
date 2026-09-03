import { buildAdsTxt } from "@/lib/adsense/ads-txt";
export async function GET() { const content = buildAdsTxt(process.env.ADSENSE_PUBLISHER_ID); if (!content) return new Response(null, { status: 404 }); return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } }); }
