import { AIProviderError } from "./errors";
import type { AIConfig, AIProvider } from "./types";

type Environment = Record<string, string | undefined>;
const providers = new Set<AIProvider>(["deepseek", "openai", "gemini"]);

export function resolveAIConfig(env: Environment = process.env): AIConfig {
  const rawProvider = (env.LLM_PROVIDER || "deepseek").toLowerCase();
  if (!providers.has(rawProvider as AIProvider)) throw new Error(`不支援的 LLM_PROVIDER：${rawProvider}`);
  const provider = rawProvider as AIProvider;
  const prefix = provider.toUpperCase();
  const apiKeyName = `${prefix}_API_KEY`;
  const modelName = `${prefix}_MODEL`;
  const apiKey = env[apiKeyName]?.trim() || "";
  const model = env[modelName]?.trim() || "";
  if (!apiKey) throw new AIProviderError("configuration");
  if (!model) throw new Error(`${modelName} 尚未設定`);
  return { provider, apiKey, model };
}
