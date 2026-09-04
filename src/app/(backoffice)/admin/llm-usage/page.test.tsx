import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UsagePage from "./page";

const { getCurrentUser, getUsageDashboard } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getUsageDashboard: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { lLMModelPrice: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/lib/ai/usage-query", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/usage-query")>("@/lib/ai/usage-query");
  return { ...actual, getUsageDashboard };
});

describe("LLM usage page", () => {
  it("renders KPI totals, filters, rows, and unknown costs for owners", async () => {
    getCurrentUser.mockResolvedValueOnce({ role: "OWNER" });
    getUsageDashboard.mockResolvedValueOnce({
      totals: { calls: 2, successes: 1, successRate: 0.5, inputTokens: 100, outputTokens: 20, estimatedCostUsd: "0.0012" },
      rows: [{
        id: "usage-1", createdAt: "2026-09-04T10:00:00.000Z", promptName: "文章改寫", promptKey: "ARTICLE_REWRITE",
        promptVersion: 2, provider: "openai", model: "gpt-5", status: "FAILURE", inputTokens: 100, outputTokens: null,
        totalTokens: null, durationMs: 850, estimatedCostUsd: null, errorSummary: "已達使用上限",
      }],
      totalRows: 1, page: 1, pageSize: 50,
      filterOptions: { promptKeys: ["ARTICLE_REWRITE"], providers: ["openai"], models: ["gpt-5"] },
    });
    render(await UsagePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "LLM 用量管理" })).toBeInTheDocument();
    for (const label of ["總呼叫數", "成功率", "輸入 Token", "輸出 Token", "估算成本（USD）"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("狀態")).toBeInTheDocument();
    expect(screen.getByText(/ARTICLE_REWRITE · v2/)).toBeInTheDocument();
    expect(screen.getByText("無法估算")).toBeInTheDocument();
  });

  it.each([
    ["price-updated", "模型費率已更新。"],
    ["price-deleted", "模型費率已刪除。"],
  ])("shows the matching confirmation for %s", async (success, expected) => {
    getCurrentUser.mockResolvedValueOnce({ role: "OWNER" });
    getUsageDashboard.mockResolvedValueOnce({
      totals: { calls: 0, successes: 0, successRate: null, inputTokens: 0, outputTokens: 0, estimatedCostUsd: "0" },
      rows: [], totalRows: 0, page: 1, pageSize: 50,
      filterOptions: { promptKeys: [], providers: [], models: [] },
    });

    render(await UsagePage({ searchParams: Promise.resolve({ success }) }));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
