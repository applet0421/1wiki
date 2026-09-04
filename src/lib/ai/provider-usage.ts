import type { NormalizedTokenUsage } from "./types";

type UsageFields = { input: string; output: string; total: string };

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function normalize(value: unknown, fields: UsageFields): NormalizedTokenUsage {
  const usage = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const inputTokens = count(usage[fields.input]);
  const outputTokens = count(usage[fields.output]);
  const reportedTotal = count(usage[fields.total]);
  return {
    inputTokens,
    outputTokens,
    totalTokens: reportedTotal ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null),
  };
}

export function normalizeOpenAIUsage(value: unknown): NormalizedTokenUsage {
  return normalize(value, { input: "input_tokens", output: "output_tokens", total: "total_tokens" });
}

export function normalizeDeepSeekUsage(value: unknown): NormalizedTokenUsage {
  return normalize(value, { input: "prompt_tokens", output: "completion_tokens", total: "total_tokens" });
}

export function normalizeGeminiUsage(value: unknown): NormalizedTokenUsage {
  return normalize(value, { input: "promptTokenCount", output: "candidatesTokenCount", total: "totalTokenCount" });
}
