"use server";

import { z } from "zod";
import { ArticlePanel } from "@/components/site/article-panel";
import { getNextCategoryArticle } from "@/lib/content/next-article";
import { prisma } from "@/lib/db/prisma";
import { localeSchema } from "@/lib/content/schema";

const requestSchema = z.tuple([localeSchema, z.string().min(1).max(160), z.string().min(1).max(128).nullable()]);

export async function loadNextArticle(locale: string, sourceSlug: string, afterId: string | null) {
  const parsed = requestSchema.safeParse([locale, sourceSlug, afterId]);
  if (!parsed.success) return null;
  const [validLocale, validSlug, validAfter] = parsed.data;
  const post = await getNextCategoryArticle(prisma, validLocale, validSlug, validAfter);
  return post ? { id: post.id, content: <ArticlePanel post={post} locale={validLocale} /> } : null;
}
