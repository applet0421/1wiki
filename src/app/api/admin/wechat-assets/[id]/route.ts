import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { WECHAT_STAGING_TTL_MS } from "@/lib/wechat-import/retention";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!user || user.mustChangePassword || !user.isActive) return new Response(null, { status: 401, headers });
  const { id } = await params;
  const now = new Date();
  const asset = await prisma.weChatImportAsset.findFirst({
    where: { id, import: { is: { userId: user.id, status: { notIn: ["EXPIRED", "ABANDONED"] }, expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - WECHAT_STAGING_TTL_MS) } } } },
    select: { imageBytes: true, mimeType: true },
  });
  if (!asset?.imageBytes || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(asset.mimeType)) return new Response(null, { status: 404, headers });
  return new Response(Uint8Array.from(asset.imageBytes), { headers: { ...headers, "Content-Type": asset.mimeType } });
}
