import { describe, expect, it } from "vitest";
import { resolveAIConfig } from "./config";

describe("resolveAIConfig", () => {
  it("defaults to DeepSeek and requires only its selected credentials", () => {
    expect(resolveAIConfig({ DEEPSEEK_API_KEY: "deep-key", DEEPSEEK_MODEL: "deepseek-v4-flash" }))
      .toEqual({ provider: "deepseek", apiKey: "deep-key", model: "deepseek-v4-flash" });
  });

  it("selects Gemini without requiring other provider credentials", () => {
    expect(resolveAIConfig({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "gem-key", GEMINI_MODEL: "gemini-model" }))
      .toEqual({ provider: "gemini", apiKey: "gem-key", model: "gemini-model" });
  });

  it("rejects unsupported and incomplete provider settings", () => {
    expect(() => resolveAIConfig({ LLM_PROVIDER: "unknown" })).toThrow("不支援");
    expect(() => resolveAIConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "key" })).toThrow("OPENAI_MODEL");
  });
});
