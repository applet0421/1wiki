import { Prisma, type PrismaClient } from "@prisma/client";
import type { AIProvider, NormalizedTokenUsage } from "./types";

export type ModelPrice = {
  inputUsdPerMillionTokens: Prisma.Decimal;
  outputUsdPerMillionTokens: Prisma.Decimal;
};

export type RecordUsageInput = {
  promptDefinitionId: string;
  promptVersionId: string;
  provider: AIProvider;
  model: string;
  status: "SUCCESS" | "FAILURE";
  usage: NormalizedTokenUsage;
  durationMs: number;
  error?: unknown;
  price: ModelPrice | null;
  startedAt: Date;
};

const MILLION = new Prisma.Decimal(1_000_000);

export function estimateCost(usage: NormalizedTokenUsage, price: ModelPrice | null): Prisma.Decimal | null {
  if (!price || usage.inputTokens === null || usage.outputTokens === null) return null;
  return new Prisma.Decimal(usage.inputTokens)
    .mul(price.inputUsdPerMillionTokens)
    .div(MILLION)
    .add(new Prisma.Decimal(usage.outputTokens).mul(price.outputUsdPerMillionTokens).div(MILLION));
}

export function sanitizeErrorSummary(error: unknown): string | null {
  if (!error) return null;
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/Authorization:\s*Bearer\s+[^\s]+/giu, "Authorization: Bearer [redacted]")
    .replace(/(?:api[_-]?key|token|secret)\s*[:=]\s*[^\s]+/giu, "$1=[redacted]")
    .replace(/[\r\n\t]+/gu, " ")
    .slice(0, 500);
}

export async function findEffectivePrice(
  client: PrismaClient,
  provider: AIProvider,
  model: string,
  startedAt: Date,
): Promise<ModelPrice | null> {
  return client.lLMModelPrice.findFirst({
    where: { provider: provider.toLowerCase(), model, effectiveAt: { lte: startedAt } },
    orderBy: { effectiveAt: "desc" },
    select: { inputUsdPerMillionTokens: true, outputUsdPerMillionTokens: true },
  });
}

export async function recordLLMUsage(client: PrismaClient, input: RecordUsageInput): Promise<void> {
  const estimatedCostUsd = estimateCost(input.usage, input.price);
  await client.lLMUsage.create({
    data: {
      promptDefinitionId: input.promptDefinitionId,
      promptVersionId: input.promptVersionId,
      provider: input.provider,
      model: input.model,
      status: input.status,
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      errorSummary: sanitizeErrorSummary(input.error),
      inputUsdPerMillionTokensSnapshot: input.price?.inputUsdPerMillionTokens,
      outputUsdPerMillionTokensSnapshot: input.price?.outputUsdPerMillionTokens,
      estimatedCostUsd,
      createdAt: input.startedAt,
    },
  });
}
