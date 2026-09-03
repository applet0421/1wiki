import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { resolveAIConfig } from "./config";
import { buildArticlePrompt } from "./prompt";
import { callDeepSeek } from "./providers/deepseek";
import { callGemini } from "./providers/gemini";
import { callOpenAI } from "./providers/openai";
import type { GenerateArticleInput, GeneratedArticle } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch };
export async function generateArticle(input: GenerateArticleInput, options: Options = {}): Promise<GeneratedArticle> {
  const config = resolveAIConfig(options.env);
  const request = { apiKey: config.apiKey, model: config.model, prompt: buildArticlePrompt(input), fetcher: options.fetcher };
  const generated = config.provider === "openai" ? await callOpenAI(request) : config.provider === "gemini" ? await callGemini(request) : await callDeepSeek(request);
  return { ...generated, contentHtml: sanitizeArticleHtml(generated.contentHtml) };
}
