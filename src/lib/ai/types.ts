export type AIProvider = "deepseek" | "openai" | "gemini";
export type AIConfig = { provider: AIProvider; apiKey: string; model: string };
export type GenerateArticleInput = { topic: string; keyword: string; instructions?: string };
export type RewriteArticleInput = { sourceTitle: string; sourceContentHtml: string };
export type GeneratedArticle = { title: string; contentHtml: string; excerpt: string; seoTitle: string; seoDescription: string; seoKeywords: string };
export type ProviderRequest = { apiKey: string; model: string; prompt: string; fetcher?: typeof fetch };
