import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import { normalizeGeminiUsage } from "../provider-usage";
import type { GeneratedArticle, ProviderRequest, ProviderResult, StructuredProviderRequest } from "../types";

export async function callGeminiStructuredWithUsage<T>({ apiKey, model, prompt, fetcher = fetch, parse, jsonSchema }: StructuredProviderRequest<T>): Promise<ProviderResult<T>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const result = await executeProviderRequest(fetcher, url, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema } }),
  }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: unknown };
  const usage = normalizeGeminiUsage(result.usageMetadata);
  try {
    return { value: parse(result.candidates?.[0]?.content?.parts?.[0]?.text), usage };
  } catch (error) {
    if (error && typeof error === "object") Object.assign(error, { usage });
    throw error;
  }
}

export async function callGeminiStructured<T>(request: StructuredProviderRequest<T>): Promise<T> {
  return (await callGeminiStructuredWithUsage(request)).value;
}

export async function callGemini({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callGeminiStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: articleJsonSchema, schemaName: "article" });
}
