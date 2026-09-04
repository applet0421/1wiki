import { AIProviderError, executeProviderRequest, parseArticleJson } from "../errors";
import { normalizeDeepSeekUsage } from "../provider-usage";
import type { GeneratedArticle, ProviderRequest, ProviderResult, StructuredProviderRequest } from "../types";

export async function callDeepSeekStructuredWithUsage<T>({ apiKey, model, prompt, fetcher = fetch, parse, maxTokens = 2400, systemPrompt = "你是 1Wiki 的科技教學編輯。只輸出符合要求的 JSON。" }: StructuredProviderRequest<T>): Promise<ProviderResult<T>> {
  const result = await executeProviderRequest(fetcher, "https://api.deepseek.com/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, response_format: { type: "json_object" }, thinking: { type: "disabled" }, max_tokens: maxTokens, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] }),
  }) as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }>; usage?: unknown };
  const usage = normalizeDeepSeekUsage(result.usage);
  if (result.choices?.[0]?.finish_reason === "length") {
    const error = new AIProviderError("output_limit");
    error.usage = usage;
    throw error;
  }
  try {
    return { value: parse(result.choices?.[0]?.message?.content), usage };
  } catch (error) {
    if (error && typeof error === "object") Object.assign(error, { usage });
    throw error;
  }
}

export async function callDeepSeekStructured<T>(request: StructuredProviderRequest<T>): Promise<T> {
  return (await callDeepSeekStructuredWithUsage(request)).value;
}

export async function callDeepSeek({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callDeepSeekStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: {}, schemaName: "article" });
}
