import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAIConfig } from "./config";
import { getActivePrompt, type ActivePrompt } from "./prompt-repository";
import { renderPromptTemplate, validatePromptTemplate } from "./prompt-template";
import type { PromptKey } from "./prompt-definitions";
import { callDeepSeekStructuredWithUsage } from "./providers/deepseek";
import { callGeminiStructuredWithUsage } from "./providers/gemini";
import { callOpenAIStructuredWithUsage } from "./providers/openai";
import { findEffectivePrice, recordLLMUsage, type ModelPrice, type RecordUsageInput } from "./usage-repository";
import type { AIProvider, NormalizedTokenUsage, ProviderResult, StructuredProviderRequest } from "./types";

export type ExecuteLLMInput<T> = {
  key: PromptKey;
  variables: Record<string, string>;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  parse: (value: unknown) => T;
};

type ProviderCallInput<T> = StructuredProviderRequest<T> & { provider: AIProvider };

export type ExecuteLLMOptions<T> = {
  client?: PrismaClient;
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  now?: () => Date;
  getPrompt?: (key: PromptKey) => Promise<ActivePrompt>;
  findPrice?: (provider: AIProvider, model: string, startedAt: Date) => Promise<ModelPrice | null>;
  recordUsage?: (input: RecordUsageInput) => Promise<void>;
  callProvider?: (input: ProviderCallInput<T>) => Promise<ProviderResult<T>>;
  onAuditError?: (error: unknown) => void;
};

const EMPTY_USAGE: NormalizedTokenUsage = { inputTokens: null, outputTokens: null, totalTokens: null };

async function defaultProviderCall<T>(input: ProviderCallInput<T>): Promise<ProviderResult<T>> {
  if (input.provider === "openai") return callOpenAIStructuredWithUsage(input);
  if (input.provider === "gemini") return callGeminiStructuredWithUsage(input);
  return callDeepSeekStructuredWithUsage(input);
}

function usageFromError(error: unknown): NormalizedTokenUsage {
  if (error && typeof error === "object" && "usage" in error) {
    const usage = (error as { usage?: NormalizedTokenUsage }).usage;
    if (usage) return usage;
  }
  return EMPTY_USAGE;
}

function assertVariables(prompt: ActivePrompt, variables: Record<string, string>): void {
  const unknown = Object.keys(variables).find((name) => !prompt.allowedVariables.includes(name));
  if (unknown) throw new Error(`未知 Prompt 變數：${unknown}`);
  const missing = prompt.requiredVariables.find((name) => !Object.hasOwn(variables, name));
  if (missing) throw new Error(`缺少 Prompt 變數：${missing}`);
}

export async function executeLLMCall<T>(input: ExecuteLLMInput<T>, options: ExecuteLLMOptions<T> = {}): Promise<T> {
  const client = options.client ?? prisma;
  const config = resolveAIConfig(options.env);
  const now = options.now ?? (() => new Date());
  const prompt = await (options.getPrompt ?? ((key) => getActivePrompt(client, key)))(input.key);
  validatePromptTemplate(prompt);
  assertVariables(prompt, input.variables);
  const systemPrompt = renderPromptTemplate(prompt.systemTemplate, input.variables);
  const userPrompt = renderPromptTemplate(prompt.userTemplate, input.variables);
  const startedAt = now();
  const callProvider = options.callProvider ?? defaultProviderCall;
  const findPrice = options.findPrice ?? ((provider, model, date) => findEffectivePrice(client, provider, model, date));
  const recordUsage = options.recordUsage ?? ((usageInput) => recordLLMUsage(client, usageInput));
  const onAuditError = options.onAuditError ?? ((error) => console.error("LLM usage audit failed", error));

  async function audit(status: "SUCCESS" | "FAILURE", usage: NormalizedTokenUsage, error?: unknown) {
    try {
      const price = await findPrice(config.provider, config.model, startedAt);
      await recordUsage({
        promptDefinitionId: prompt.definitionId,
        promptVersionId: prompt.versionId,
        provider: config.provider,
        model: config.model,
        status,
        usage,
        durationMs: now().getTime() - startedAt.getTime(),
        error,
        price,
        startedAt,
      });
    } catch (auditError) {
      onAuditError(auditError);
    }
  }

  try {
    const result = await callProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      prompt: userPrompt,
      systemPrompt,
      fetcher: options.fetcher,
      jsonSchema: input.jsonSchema,
      schemaName: input.schemaName,
      maxTokens: input.maxTokens,
      parse: input.parse,
    });
    await audit("SUCCESS", result.usage);
    return result.value;
  } catch (error) {
    await audit("FAILURE", usageFromError(error), error);
    throw error;
  }
}
