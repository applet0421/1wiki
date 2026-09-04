import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest, StructuredProviderRequest } from "../types";

export async function callDeepSeekStructured<T>({ apiKey, model, prompt, fetcher = fetch, parse, maxTokens = 2400, systemPrompt = "你是 1Wiki 的繁體中文科技教學編輯。只輸出符合要求的 JSON。" }: StructuredProviderRequest<T>): Promise<T> {
  const result = await executeProviderRequest(fetcher, "https://api.deepseek.com/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, response_format: { type: "json_object" }, thinking: { type: "disabled" }, max_tokens: maxTokens, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] }),
  }) as { choices?: Array<{ message?: { content?: string } }> };
  return parse(result.choices?.[0]?.message?.content);
}

export async function callDeepSeek({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callDeepSeekStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: {}, schemaName: "article" });
}
