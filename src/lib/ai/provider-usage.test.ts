import { describe, expect, it } from "vitest";
import { normalizeDeepSeekUsage, normalizeGeminiUsage, normalizeOpenAIUsage } from "./provider-usage";

describe("provider token usage", () => {
  it("normalizes OpenAI Responses usage", () => {
    expect(normalizeOpenAIUsage({ input_tokens: 120, output_tokens: 30, total_tokens: 150 }))
      .toEqual({ inputTokens: 120, outputTokens: 30, totalTokens: 150 });
  });

  it("normalizes DeepSeek chat completion usage", () => {
    expect(normalizeDeepSeekUsage({ prompt_tokens: 90, completion_tokens: 10, total_tokens: 100 }))
      .toEqual({ inputTokens: 90, outputTokens: 10, totalTokens: 100 });
  });

  it("normalizes Gemini usage metadata", () => {
    expect(normalizeGeminiUsage({ promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 }))
      .toEqual({ inputTokens: 80, outputTokens: 20, totalTokens: 100 });
  });

  it("derives total only when both sides are known", () => {
    expect(normalizeOpenAIUsage({ input_tokens: 5, output_tokens: 7 }))
      .toEqual({ inputTokens: 5, outputTokens: 7, totalTokens: 12 });
    expect(normalizeOpenAIUsage({ input_tokens: 5 }))
      .toEqual({ inputTokens: 5, outputTokens: null, totalTokens: null });
  });

  it("rejects malformed counts without guessing", () => {
    expect(normalizeGeminiUsage(undefined)).toEqual({ inputTokens: null, outputTokens: null, totalTokens: null });
    expect(normalizeDeepSeekUsage({ prompt_tokens: -1, completion_tokens: 2.5, total_tokens: "4" }))
      .toEqual({ inputTokens: null, outputTokens: null, totalTokens: null });
  });
});
