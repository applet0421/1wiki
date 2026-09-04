import { describe, expect, it, vi } from "vitest";
import { callDeepSeek, callDeepSeekStructured, callDeepSeekStructuredWithUsage } from "./deepseek";
import { callGemini, callGeminiStructured, callGeminiStructuredWithUsage } from "./gemini";
import { callOpenAI, callOpenAIStructured, callOpenAIStructuredWithUsage } from "./openai";
import { AIProviderError, parseArticleJson, parseStructuredJson } from "../errors";
import { contentIdeasJsonSchema, contentIdeasResponseSchema } from "../schema";

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
const ideas = { ideas: [{ type: "HOW_TO", title: "LINE 備份教學", primaryKeyword: "LINE 備份", searchIntent: "備份聊天記錄", support: "STRONG" }] };
const ideasJson = JSON.stringify(ideas);
const structuredRequest = {
  apiKey: "secret",
  model: "model",
  prompt: "analyze",
  jsonSchema: contentIdeasJsonSchema,
  schemaName: "content_ideas",
  parse: (value: unknown) => parseStructuredJson(value, (parsed) => contentIdeasResponseSchema.parse(parsed)),
};

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

  it("parses content ideas from DeepSeek structured output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ choices: [{ message: { content: ideasJson } }] }), { status: 200 }));
    await expect(callDeepSeekStructured({ ...structuredRequest, fetcher })).resolves.toEqual(ideas);
  });

  it("parses content ideas from OpenAI structured output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: ideasJson }] }] }), { status: 200 }));
    await expect(callOpenAIStructured({ ...structuredRequest, fetcher })).resolves.toEqual(ideas);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).text.format.name).toBe("content_ideas");
  });

  it("parses content ideas from Gemini structured output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: ideasJson }] } }] }), { status: 200 }));
    await expect(callGeminiStructured({ ...structuredRequest, fetcher })).resolves.toEqual(ideas);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).generationConfig.responseSchema).toEqual(contentIdeasJsonSchema);
  });

  it("returns normalized OpenAI token usage from the audited wrapper", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text: ideasJson }] }],
      usage: { input_tokens: 101, output_tokens: 49, total_tokens: 150 },
    }), { status: 200 }));
    await expect(callOpenAIStructuredWithUsage({ ...structuredRequest, fetcher })).resolves.toEqual({
      value: ideas,
      usage: { inputTokens: 101, outputTokens: 49, totalTokens: 150 },
    });
  });

  it("returns normalized DeepSeek token usage from the audited wrapper", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ message: { content: ideasJson } }],
      usage: { prompt_tokens: 90, completion_tokens: 10, total_tokens: 100 },
    }), { status: 200 }));
    await expect(callDeepSeekStructuredWithUsage({ ...structuredRequest, fetcher })).resolves.toEqual({
      value: ideas,
      usage: { inputTokens: 90, outputTokens: 10, totalTokens: 100 },
    });
  });

  it("returns normalized Gemini token usage from the audited wrapper", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: ideasJson }] } }],
      usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 },
    }), { status: 200 }));
    await expect(callGeminiStructuredWithUsage({ ...structuredRequest, fetcher })).resolves.toEqual({
      value: ideas,
      usage: { inputTokens: 80, outputTokens: 20, totalTokens: 100 },
    });
  });

  it("retains usage when structured output parsing fails", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text: "not json" }] }],
      usage: { input_tokens: 7, output_tokens: 2, total_tokens: 9 },
    }), { status: 200 }));
    const error = await callOpenAIStructuredWithUsage({ ...structuredRequest, fetcher }).catch((caught) => caught);
    expect(error).toBeInstanceOf(AIProviderError);
    expect(error.usage).toEqual({ inputTokens: 7, outputTokens: 2, totalTokens: 9 });
  });

  it("reports a specific error when DeepSeek truncates structured output", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      choices: [{ finish_reason: "length", message: { content: '{"title":"未完成"' } }],
      usage: { prompt_tokens: 100, completion_tokens: 2400, total_tokens: 2500 },
    }), { status: 200 }));

    const error = await callDeepSeekStructuredWithUsage({ ...structuredRequest, fetcher }).catch((caught) => caught);

    expect(error).toBeInstanceOf(AIProviderError);
    expect(error.category).toBe("output_limit");
    expect(error.message).toBe("AI 生成內容超過長度上限，請縮短補充要求後重試。");
    expect(error.usage).toEqual({ inputTokens: 100, outputTokens: 2400, totalTokens: 2500 });
  });
});
