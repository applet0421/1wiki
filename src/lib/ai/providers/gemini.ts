import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest, StructuredProviderRequest } from "../types";

export async function callGeminiStructured<T>({ apiKey, model, prompt, fetcher = fetch, parse, jsonSchema }: StructuredProviderRequest<T>): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const result = await executeProviderRequest(fetcher, url, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: jsonSchema } }),
  }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parse(result.candidates?.[0]?.content?.parts?.[0]?.text);
}

export async function callGemini({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  return callGeminiStructured({ apiKey, model, prompt, fetcher, parse: parseArticleJson, jsonSchema: articleJsonSchema, schemaName: "article" });
}
