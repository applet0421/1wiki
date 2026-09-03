export type AIErrorCategory = "configuration" | "authentication" | "rate_limit" | "timeout" | "upstream" | "invalid_output";

const publicMessages: Record<AIErrorCategory, string> = {
  configuration: "AI 服務尚未正確設定。",
  authentication: "AI 服務驗證失敗，請檢查後台環境設定。",
  rate_limit: "AI 服務目前已達使用上限，請稍後再試。",
  timeout: "AI 服務回應逾時，請稍後再試。",
  upstream: "AI 服務目前無法完成請求，請稍後再試。",
  invalid_output: "AI 回傳內容格式不正確，請調整題目後重試。",
};

export class AIProviderError extends Error {
  constructor(public readonly category: AIErrorCategory) {
    super(publicMessages[category]);
    this.name = "AIProviderError";
  }
}

export function errorForStatus(status: number): AIProviderError {
  if (status === 401 || status === 403) return new AIProviderError("authentication");
  if (status === 429) return new AIProviderError("rate_limit");
  return new AIProviderError("upstream");
}

export async function executeProviderRequest(fetcher: typeof fetch, url: string, init: RequestInit): Promise<unknown> {
  try {
    const response = await fetcher(url, { ...init, signal: init.signal || AbortSignal.timeout(60_000) });
    if (!response.ok) throw errorForStatus(response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") throw new AIProviderError("timeout");
    throw new AIProviderError("upstream");
  }
}

export function parseArticleJson(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return generatedArticleSchema.parse(parsed);
  } catch {
    throw new AIProviderError("invalid_output");
  }
}
import { generatedArticleSchema } from "./schema";
