import { describe, expect, it } from "vitest";
import { createReport, mergeReport } from "./report";

describe("WeChat import report", () => {
  it("creates a stable report with an ISO generated timestamp", () => {
    const report = createReport("fetch", { status: "partial", title: "文章", expectedImages: 2, successfulImages: 1, failedImages: 1 });
    expect(report).toMatchObject({ summary: { stage: "fetch", status: "partial", title: "文章", expectedImages: 2 }, success: [], failure: [] });
    expect(new Date(report.generated_at).toISOString()).toBe(report.generated_at);
  });

  it("merges sanitized success and failure entries", () => {
    const report = mergeReport(createReport("rewrite", { status: "success" }), {
      success: [{ code: "REWRITE_OK", item: "b-0001" }],
      failure: [{ code: "LLM_FAILED", item: "provider", retryable: true, detail: "x".repeat(600) }],
    });
    expect(report.success).toHaveLength(1);
    expect(report.failure[0].detail).toHaveLength(500);
  });
});
