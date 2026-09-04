"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { rewriteArticle } from "@/lib/ai/rewrite-article";
import type { RewriteArticleInput } from "@/lib/ai/types";

export async function rewriteArticleAction(input: RewriteArticleInput) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return { ok: false as const, error: "請先登入後台。" };

  try {
    return { ok: true as const, data: await rewriteArticle(input) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "AI 改寫失敗，請稍後再試。",
    };
  }
}
