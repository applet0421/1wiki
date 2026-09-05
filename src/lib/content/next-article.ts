import type { Prisma, PrismaClient } from "@prisma/client";
import type { Locale } from "@/lib/i18n/config";

export async function getNextCategoryArticle(client: PrismaClient | Prisma.TransactionClient, locale: Locale, sourceSlug: string, afterId: string | null, now = new Date()) {
  const source = await client.post.findFirst({
    where: { locale, slug: sourceSlug, status: "PUBLISHED", publishedAt: { lte: now } },
    select: { id: true, categoryId: true },
  });
  if (!source) return null;
  const after = afterId ? await client.post.findFirst({
    where: { id: afterId, locale, categoryId: source.categoryId, status: "PUBLISHED", publishedAt: { lte: now } },
    select: { id: true, publishedAt: true },
  }) : null;
  if (afterId && !after?.publishedAt) return null;

  return client.post.findFirst({
    where: {
      locale, categoryId: source.categoryId, status: "PUBLISHED", id: { not: source.id }, publishedAt: { lte: now },
      ...(after?.publishedAt ? { OR: [
        { publishedAt: { lt: after.publishedAt } },
        { publishedAt: after.publishedAt, id: { lt: after.id } },
      ] } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    include: { category: { include: { parent: { include: { parent: true } } } }, author: { select: { displayName: true } } },
  });
}
