import type { WeChatImportReport } from "./types";

type SummaryInput = WeChatImportReport["summary"];
type ReportEntries = Pick<WeChatImportReport, "success" | "failure">;

function clip(value: string, limit = 500): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, limit);
}

export function createReport(stage: SummaryInput["stage"], summary: Omit<SummaryInput, "stage">): WeChatImportReport {
  return { generated_at: new Date().toISOString(), summary: { stage, ...summary }, success: [], failure: [] };
}

export function mergeReport(report: WeChatImportReport, entries: Partial<ReportEntries>): WeChatImportReport {
  return {
    ...report,
    generated_at: new Date().toISOString(),
    success: [...report.success, ...(entries.success || []).map((entry) => ({ ...entry, code: clip(entry.code, 80), item: clip(entry.item, 500), ...(entry.detail ? { detail: clip(entry.detail) } : {}) }))],
    failure: [...report.failure, ...(entries.failure || []).map((entry) => ({ ...entry, code: clip(entry.code, 80), item: clip(entry.item, 500), retryable: entry.retryable, detail: clip(entry.detail) }))],
  };
}
