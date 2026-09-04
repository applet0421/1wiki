import { describe, expect, it, vi } from "vitest";
import { callDeepSeek } from "./deepseek";
import { callGemini } from "./gemini";
import { callOpenAI } from "./openai";
import { AIProviderError, parseArticleJson } from "../errors";

const article = {
  title: "ChatGPT 登入修復",
  slug: "chatgpt-login-fix",
  contentHtml: "<h2>檢查</h2><p>依序處理。</p>",
  excerpt: "登入問題排解步驟。",
  seoTitle: "ChatGPT 登入問題修復",
  seoDescription: "逐步排除登入問題。",
  seoKeywords: "ChatGPT,登入",
};
const json = JSON.stringify(article);

describe("AI provider adapters", () => {
  it("accepts a valid article JSON wrapped in a Markdown code fence", () => {
    expect(parseArticleJson("```json\n" + json + "\n```")).toEqual(article);
  });

  it("calls DeepSeek chat completions with JSON output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: json } }] }), { status: 200 }));
    await expect(callDeepSeek({ apiKey: "secret", model: "deepseek-v4-flash", prompt: "prompt", fetcher })).resolves.toEqual(article);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      max_tokens: 2400,
    });
  });

  it("calls OpenAI Responses with a strict JSON schema", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: json }] }] }), { status: 200 }));
    await expect(callOpenAI({ apiKey: "secret", model: "gpt-model", prompt: "prompt", fetcher })).resolves.toEqual(article);
    const [, request] = fetcher.mock.calls[0];
    expect(JSON.parse(String(request?.body)).text.format).toMatchObject({ type: "json_schema", name: "article", strict: true });
  });

  it("calls Gemini generateContent with JSON response settings", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: json }] } }] }), { status: 200 }));
    await expect(callGemini({ apiKey: "secret", model: "gemini-model", prompt: "prompt", fetcher })).resolves.toEqual(article);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toContain("gemini-model:generateContent");
    expect(JSON.parse(String(request?.body)).generationConfig.responseMimeType).toBe("application/json");
  });

  it("classifies rate limits without leaking the API key", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("quota", { status: 429 }));
    const error = await callDeepSeek({ apiKey: "top-secret-key", model: "model", prompt: "prompt", fetcher }).catch((caught) => caught);
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error.category).toBe("rate_limit");
    expect(error.message).not.toContain("top-secret-key");
  });
});
