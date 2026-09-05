import type { Locale } from "@/lib/i18n/config";

export type AIProvider = "deepseek" | "openai" | "gemini";
export type AIConfig = { provider: AIProvider; apiKey: string; model: string };
export type NormalizedTokenUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null; imageOutputTokens?: number | null };
export type ProviderResult<T> = { value: T; usage: NormalizedTokenUsage };
export type GenerateArticleInput = { locale: Locale; topic: string; keyword: string; instructions?: string };
export type RewriteArticleInput = { locale: Locale; sourceTitle: string; sourceContentHtml: string };
export type GeneratedArticle = { title: string; slug: string; contentHtml: string; excerpt: string; seoTitle: string; seoDescription: string; seoKeywords: string };
export type ProviderRequest = { apiKey: string; model: string; prompt: string; fetcher?: typeof fetch };
export type AIContentType = "TROUBLESHOOTING" | "HOW_TO";
export type SourceSupport = "STRONG" | "MEDIUM";
export type ContentIdea = {
  type: AIContentType;
  title: string;
  primaryKeyword: string;
  searchIntent: string;
  support: SourceSupport;
};
export type AnalyzeSourceInput = { locale: Locale; sourceContent: string };
export type AnalyzeSourceResult = { ideas: ContentIdea[] };
export type AICategoryOption = { id: string; name: string };
export type GenerateFromIdeaInput = {
  locale: Locale;
  sourceContent: string;
  idea: ContentIdea;
  categories: AICategoryOption[];
};
export type GeneratedContentDraft = GeneratedArticle & {
  categoryId: string;
  needsVerification: string[];
};
export type GeneratedDraftResult = { postId: string };

export type StructuredProviderRequest<T> = ProviderRequest & {
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  parse: (value: unknown) => T;
  maxTokens?: number;
  systemPrompt?: string;
};
