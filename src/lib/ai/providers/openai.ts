import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest, StructuredProviderRequest } from "../types";

export async function callOpenAIStructured<T>({ apiKey, model, prompt, fetcher = fetch, parse, jsonSchema, schemaName, systemPrompt = "你是 1Wiki 的科技教學編輯。" }: StructuredProviderRequest<T>): Promise<T> {
  const result = await executeProviderRequest(fetcher, "https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], text: { format: { type: "json_schema", name: schemaName, strict: true, schema: jsonSchema } } }),
  }) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const text = result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  return parse(text);
}

export async function callOpenAI({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callOpenAIStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: articleJsonSchema, schemaName: "article" });
}
