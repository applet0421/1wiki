"use server";

import { revalidatePath } from "next/cache";
import { analyzeSource, generateFromIdea } from "@/lib/ai/content-generator";
import { contentIdeaSchema } from "@/lib/ai/schema";
import type { AnalyzeSourceInput, ContentIdea, GenerateFromIdeaInput } from "@/lib/ai/types";
import { getCurrentUser } from "@/lib/auth/session";
import { findAvailablePostSlug, savePost } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";

async function authorizedUser() {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return null;
  return user;
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function analyzeContentAction(input: AnalyzeSourceInput) {
  if (!await authorizedUser()) return { ok: false as const, error: "請先登入後台。" };
  try {
    return { ok: true as const, data: await analyzeSource(input) };
  } catch (error) {
    return { ok: false as const, error: message(error, "AI 分析失敗，請稍後再試。") };
  }
}

export async function generateContentDraftAction(input: { sourceContent: string; idea: ContentIdea }) {
  const user = await authorizedUser();
  if (!user) return { ok: false as const, error: "請先登入後台。" };
  try {
    const idea = contentIdeaSchema.parse(input.idea);
    const categories = await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
    const request: GenerateFromIdeaInput = { sourceContent: input.sourceContent, idea, categories };
    const generated = await generateFromIdea(request);
    const slug = await findAvailablePostSlug(prisma, generated.slug);
    const post = await savePost(prisma, user.id, {
      title: generated.title,
      slug,
      excerpt: generated.excerpt,
      contentHtml: generated.contentHtml,
      coverImage: "",
      status: "DRAFT",
      categoryId: generated.categoryId,
      seoTitle: generated.seoTitle,
      seoDescription: generated.seoDescription,
      seoKeywords: generated.seoKeywords,
      canonicalUrl: "",
      aiContentType: idea.type,
      primaryKeyword: idea.primaryKeyword,
      searchIntent: idea.searchIntent,
      aiSourceSupport: idea.support,
      aiNeedsVerification: generated.needsVerification,
    });
    revalidatePath("/admin");
    return { ok: true as const, data: { postId: post.id } };
  } catch (error) {
    return { ok: false as const, error: message(error, "AI 生成失敗，請稍後再試。") };
  }
}
