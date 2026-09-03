import { articleJsonSchema } from "../schema";
import { executeProviderRequest, parseArticleJson } from "../errors";
import type { GeneratedArticle, ProviderRequest } from "../types";

export async function callGemini({ apiKey, model, prompt, fetcher = fetch }: ProviderRequest): Promise<GeneratedArticle> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const result = await executeProviderRequest(fetcher, url, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: articleJsonSchema } }),
  }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseArticleJson(result.candidates?.[0]?.content?.parts?.[0]?.text);
}
