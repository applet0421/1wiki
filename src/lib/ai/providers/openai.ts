import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import { normalizeOpenAIUsage } from "../provider-usage";
import type { GeneratedArticle, ProviderRequest, ProviderResult, StructuredProviderRequest } from "../types";

export async function callOpenAIStructuredWithUsage<T>({ apiKey, model, prompt, fetcher = fetch, parse, jsonSchema, schemaName, systemPrompt = "你是 1Wiki 的科技教學編輯。" }: StructuredProviderRequest<T>): Promise<ProviderResult<T>> {
  const result = await executeProviderRequest(fetcher, "https://api.openai.com/v1/responses", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], text: { format: { type: "json_schema", name: schemaName, strict: true, schema: jsonSchema } } }),
  }) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: unknown };
  const text = result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  const usage = normalizeOpenAIUsage(result.usage);
  try {
    return { value: parse(text), usage };
  } catch (error) {
    if (error && typeof error === "object") Object.assign(error, { usage });
    throw error;
  }
}

export async function callOpenAIStructured<T>(request: StructuredProviderRequest<T>): Promise<T> {
  return (await callOpenAIStructuredWithUsage(request)).value;
}

export async function callOpenAI({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callOpenAIStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: articleJsonSchema, schemaName: "article" });
}
