import type { LLMUsageStatus, Prisma, PrismaClient } from "@prisma/client";

type RawFilters = Record<string, string | undefined>;

export type UsageFilters = {
  from: Date;
  to: Date;
  key?: string;
  provider?: string;
  model?: string;
  status?: LLMUsageStatus;
  page: number;
  pageSize: 50;
};

export type UsageRow = {
  id: string;
  createdAt: string;
  promptName: string;
  promptKey: string;
  promptVersion: number;
  provider: string;
  model: string;
  status: LLMUsageStatus;
  inputTokens: number | null;
  outputTokens: number | null;
  imageOutputTokens?: number | null;
  totalTokens: number | null;
  durationMs: number;
  estimatedCostUsd: string | null;
  errorSummary: string | null;
};

export type UsageDashboard = {
  totals: { calls: number; successes: number; successRate: number | null; inputTokens: number; outputTokens: number; estimatedCostUsd: string };
  rows: UsageRow[];
  totalRows: number;
  page: number;
  pageSize: 50;
  filterOptions: { promptKeys: string[]; providers: string[]; models: string[] };
};

function dateAt(value: string | undefined, end: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bounded(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length <= 120 ? normalized : undefined;
}

export function parseUsageFilters(raw: RawFilters, now = new Date()): UsageFilters {
  const defaultTo = new Date(now);
  defaultTo.setUTCHours(23, 59, 59, 999);
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);
  const parsedPage = Number(raw.page);
  return {
    from: dateAt(raw.from, false) ?? defaultFrom,
    to: dateAt(raw.to, true) ?? defaultTo,
    key: bounded(raw.key),
    provider: bounded(raw.provider),
    model: bounded(raw.model),
    status: raw.status === "SUCCESS" || raw.status === "FAILURE" ? raw.status : undefined,
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: 50,
  };
}

export async function getUsageDashboard(client: PrismaClient, filters: UsageFilters): Promise<UsageDashboard> {
  const where: Prisma.LLMUsageWhereInput = {
    createdAt: { gte: filters.from, lte: filters.to },
    promptDefinition: filters.key ? { key: filters.key } : undefined,
    provider: filters.provider,
    model: filters.model,
    status: filters.status,
  };
  const [totalRows, successes, aggregate, rows, promptGroups, providerGroups, modelGroups] = await Promise.all([
    client.lLMUsage.count({ where }),
    client.lLMUsage.count({ where: { ...where, status: "SUCCESS" } }),
    client.lLMUsage.aggregate({ where, _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true } }),
    client.lLMUsage.findMany({
      where,
      include: { promptDefinition: { select: { name: true, key: true } }, promptVersion: { select: { versionNumber: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    client.promptDefinition.findMany({ select: { key: true }, orderBy: { key: "asc" } }),
    client.lLMUsage.groupBy({ by: ["provider"], orderBy: { provider: "asc" } }),
    client.lLMUsage.groupBy({ by: ["model"], orderBy: { model: "asc" } }),
  ]);
  return {
    totals: {
      calls: totalRows,
      successes,
      successRate: totalRows ? successes / totalRows : null,
      inputTokens: aggregate._sum.inputTokens ?? 0,
      outputTokens: aggregate._sum.outputTokens ?? 0,
      estimatedCostUsd: aggregate._sum.estimatedCostUsd?.toString() ?? "0",
    },
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      promptName: row.promptDefinition.name,
      promptKey: row.promptDefinition.key,
      promptVersion: row.promptVersion.versionNumber,
      provider: row.provider,
      model: row.model,
      status: row.status,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      imageOutputTokens: row.imageOutputTokens,
      totalTokens: row.totalTokens,
      durationMs: row.durationMs,
      estimatedCostUsd: row.estimatedCostUsd?.toString() ?? null,
      errorSummary: row.errorSummary,
    })),
    totalRows,
    page: filters.page,
    pageSize: 50,
    filterOptions: {
      promptKeys: promptGroups.map((item) => item.key),
      providers: providerGroups.map((item) => item.provider),
      models: modelGroups.map((item) => item.model),
    },
  };
}
