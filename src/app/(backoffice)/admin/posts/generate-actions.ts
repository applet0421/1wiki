"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { generateArticle } from "@/lib/ai/generate-article";
import type { GenerateArticleInput } from "@/lib/ai/types";

export async function generateArticleAction(input: GenerateArticleInput) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return { ok: false as const, error: "請先登入後台。" };
  if (!input.topic.trim() || !input.keyword.trim()) return { ok: false as const, error: "請填寫主題與主要關鍵字。" };
  try { return { ok: true as const, data: await generateArticle(input) }; }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "AI 生成失敗，請稍後再試。" }; }
}
