import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { estimateCost, sanitizeErrorSummary } from "./usage-repository";

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

  it("removes secrets and truncates audit errors", () => {
    const summary = sanitizeErrorSummary(new Error(`Authorization: Bearer secret-key\n${"x".repeat(600)}`));
    expect(summary).not.toContain("secret-key");
    expect(summary).toHaveLength(500);
  });
});
