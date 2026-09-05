import { Prisma, type PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { estimateCost, recordLLMUsage, sanitizeErrorSummary } from "./usage-repository";

describe("LLM usage cost", () => {
  it("calculates input and output cost with decimal arithmetic", () => {
    expect(estimateCost(
      { inputTokens: 1_000_000, outputTokens: 500_000, totalTokens: 1_500_000 },
      { inputUsdPerMillionTokens: new Prisma.Decimal("0.50"), outputUsdPerMillionTokens: new Prisma.Decimal("1.50") },
    )?.toString()).toBe("1.25");
  });

  it("leaves cost unknown when tokens or rates are unavailable", () => {
    expect(estimateCost(
      { inputTokens: null, outputTokens: 10, totalTokens: null },
      { inputUsdPerMillionTokens: new Prisma.Decimal("0.50"), outputUsdPerMillionTokens: new Prisma.Decimal("1.50") },
    )).toBeNull();
    expect(estimateCost({ inputTokens: 10, outputTokens: 10, totalTokens: 20 }, null)).toBeNull();
  });

  const imagePrice = {
    inputUsdPerMillionTokens: new Prisma.Decimal("0.5"),
    outputUsdPerMillionTokens: new Prisma.Decimal("3"),
    imageOutputUsdPerMillionTokens: new Prisma.Decimal("60"),
  };

  it("charges image output separately without double counting text", () => {
    expect(estimateCost({ inputTokens: 100, outputTokens: 757, imageOutputTokens: 747, totalTokens: 857 }, imagePrice)?.toString()).toBe("0.0449");
  });

  it("leaves image cost unknown without a modality breakdown or image rate", () => {
    expect(estimateCost({ inputTokens: 100, outputTokens: 757, imageOutputTokens: null, totalTokens: 857 }, imagePrice)).toBeNull();
    expect(estimateCost({ inputTokens: 100, outputTokens: 757, imageOutputTokens: 747, totalTokens: 857 }, { ...imagePrice, imageOutputUsdPerMillionTokens: null })).toBeNull();
  });

  it.each([-1, 758, 1.5, NaN, Infinity])("rejects invalid image token count %s", (imageOutputTokens) => {
    expect(estimateCost({ inputTokens: 100, outputTokens: 757, imageOutputTokens, totalTokens: 857 }, imagePrice)).toBeNull();
  });

  it.each([-1, 1.5, NaN, Infinity])("rejects invalid total output count %s", (outputTokens) => {
    expect(estimateCost({ inputTokens: 100, outputTokens, imageOutputTokens: 747, totalTokens: null }, imagePrice)).toBeNull();
  });

  it("records image tokens and the immutable image price snapshot", async () => {
    const create = vi.fn().mockResolvedValue({});
    await recordLLMUsage({ lLMUsage: { create } } as unknown as PrismaClient, {
      promptDefinitionId: "definition", promptVersionId: "version", provider: "gemini", model: "image-model",
      status: "SUCCESS", usage: { inputTokens: 100, outputTokens: 757, imageOutputTokens: 747, totalTokens: 857 },
      durationMs: 120, price: imagePrice, startedAt: new Date("2026-09-05"),
    });
    const data = create.mock.calls[0][0].data;
    expect(data.imageOutputTokens).toBe(747);
    expect(data.imageOutputUsdPerMillionTokensSnapshot.toString()).toBe("60");
    expect(data.estimatedCostUsd.toString()).toBe("0.0449");
  });

  it("removes secrets and truncates audit errors", () => {
    const summary = sanitizeErrorSummary(new Error(`Authorization: Bearer secret-key\n${"x".repeat(600)}`));
    expect(summary).not.toContain("secret-key");
    expect(summary).toHaveLength(500);
  });
});
