import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest } from "../types";

export async function callOpenAI({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  const result = await executeProviderRequest(fetcher, "https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: [{ role: "system", content: "你是 1Wiki 的繁體中文科技教學編輯。" }, { role: "user", content: prompt }], text: { format: { type: "json_schema", name: "article", strict: true, schema: articleJsonSchema } } }),
  }) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const text = result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  return parseArticleJson(text);
}
