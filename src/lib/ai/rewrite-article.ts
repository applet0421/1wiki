import sanitizeHtml from "sanitize-html";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { resolveAIConfig } from "./config";
import { buildRewriteArticlePrompt } from "./prompt";
import { callDeepSeek } from "./providers/deepseek";
import { callGemini } from "./providers/gemini";
import { callOpenAI } from "./providers/openai";
import type { GeneratedArticle, RewriteArticleInput } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch };

function normalizeSource(input: RewriteArticleInput): RewriteArticleInput {
  const sourceTitle = input.sourceTitle.trim();
  const sourceContentHtml = sanitizeArticleHtml(input.sourceContentHtml);
  const sourceText = sanitizeHtml(sourceContentHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\u00a0/g, " ")
    .trim();

  if (!sourceTitle || !sourceText) throw new Error("請填寫原文章標題與內容。");
  if (sourceTitle.length > 180) throw new Error("原文章標題不可超過 180 字。");
  if (sourceContentHtml.length > 100_000) throw new Error("原文章內容過長，請縮短至 100,000 字元以內。");

  return { sourceTitle, sourceContentHtml };
}

export async function rewriteArticle(input: RewriteArticleInput, options: Options = {}): Promise<GeneratedArticle> {
  const source = normalizeSource(input);
  const config = resolveAIConfig(options.env);
  const request = {
    apiKey: config.apiKey,
    model: config.model,
    prompt: buildRewriteArticlePrompt(source),
    fetcher: options.fetcher,
  };
  const rewritten = config.provider === "openai"
    ? await callOpenAI(request)
    : config.provider === "gemini"
      ? await callGemini(request)
      : await callDeepSeek(request);

  return { ...rewritten, contentHtml: sanitizeArticleHtml(rewritten.contentHtml) };
}
