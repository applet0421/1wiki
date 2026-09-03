import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest } from "../types";

export async function callDeepSeek({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  const result = await executeProviderRequest(fetcher, "https://api.deepseek.com/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: "你是 1Wiki 的繁體中文科技教學編輯。只輸出符合要求的 JSON。" }, { role: "user", content: prompt }] }),
  }) as { choices?: Array<{ message?: { content?: string } }> };
  return parseArticleJson(result.choices?.[0]?.message?.content);
}
