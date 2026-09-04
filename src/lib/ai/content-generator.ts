import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { resolveAIConfig } from "./config";
import { parseStructuredJson } from "./errors";
import { buildAnalyzeSourcePrompt, buildGenerateFromIdeaPrompt } from "./prompt";
import { callDeepSeekStructured } from "./providers/deepseek";
import { callGeminiStructured } from "./providers/gemini";
import { callOpenAIStructured } from "./providers/openai";
import { contentIdeasJsonSchema, contentIdeasResponseSchema, generatedContentDraftJsonSchema, generatedContentDraftSchema } from "./schema";
import type { AnalyzeSourceInput, AnalyzeSourceResult, ContentIdea, GenerateFromIdeaInput, GeneratedContentDraft, StructuredProviderRequest } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch };

function normalizeSource(sourceContent: string): string {
  const normalized = sourceContent.trim();
  if (!normalized) throw new Error("請貼上參考內容。");
  if (normalized.length > 50_000) throw new Error("參考內容不可超過 50,000 字元。");
  return normalized;
}

async function callStructured<T>(request: StructuredProviderRequest<T>, env?: Record<string, string | undefined>): Promise<T> {
  const config = resolveAIConfig(env);
  const configured = { ...request, apiKey: config.apiKey, model: config.model };
  if (config.provider === "openai") return callOpenAIStructured(configured);
  if (config.provider === "gemini") return callGeminiStructured(configured);
  return callDeepSeekStructured(configured);
}

function intentKey(value: string): string {
  return value.toLocaleLowerCase("zh-Hant").replace(/\s+/gu, "");
}

function isSupportedIdea(idea: { support: "STRONG" | "MEDIUM" | "WEAK" }): idea is ContentIdea {
  return idea.support !== "WEAK";
}

export async function analyzeSource(input: AnalyzeSourceInput, options: Options = {}): Promise<AnalyzeSourceResult> {
  const sourceContent = normalizeSource(input.sourceContent);
  const response = await callStructured({
    apiKey: "", model: "", prompt: buildAnalyzeSourcePrompt({ locale: input.locale, sourceContent }), fetcher: options.fetcher,
    jsonSchema: contentIdeasJsonSchema, schemaName: "content_ideas", maxTokens: 1800,
    parse: (value) => parseStructuredJson(value, (parsed) => contentIdeasResponseSchema.parse(parsed)),
  }, options.env);
  const seen = new Set<string>();
  const ideas = response.ideas.filter(isSupportedIdea).filter((idea) => {
    const key = intentKey(idea.searchIntent);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((idea) => ({ ...idea, searchIntent: idea.searchIntent.trim().replace(/\s+/gu, " ") }));
  return { ideas };
}

export async function generateFromIdea(input: GenerateFromIdeaInput, options: Options = {}): Promise<GeneratedContentDraft> {
  const sourceContent = normalizeSource(input.sourceContent);
  if (input.categories.length === 0) throw new Error("目前沒有可用的文章分類。");
  const generated = await callStructured({
    apiKey: "", model: "", prompt: buildGenerateFromIdeaPrompt({ ...input, sourceContent }), fetcher: options.fetcher,
    jsonSchema: generatedContentDraftJsonSchema, schemaName: "generated_content_draft", maxTokens: 4200,
    parse: (value) => parseStructuredJson(value, (parsed) => generatedContentDraftSchema.parse(parsed)),
  }, options.env);
  if (!input.categories.some((category) => category.id === generated.categoryId)) {
    throw new Error("AI 回傳的分類不存在。");
  }
  return { ...generated, contentHtml: sanitizeArticleHtml(generated.contentHtml) };
}
