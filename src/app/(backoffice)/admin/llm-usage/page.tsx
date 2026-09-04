import Link from "next/link";
import { redirect } from "next/navigation";
import { ModelPriceForm } from "@/components/admin/model-price-form";
import { getUsageDashboard, parseUsageFilters } from "@/lib/ai/usage-query";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type SearchParams = {
  from?: string;
  to?: string;
  key?: string;
  provider?: string;
  model?: string;
  status?: string;
  page?: string;
  error?: string;
  success?: string;
};

const number = new Intl.NumberFormat("zh-TW");
const successMessages: Record<string, string> = {
  "price-created": "模型費率已新增。",
  "price-updated": "模型費率已更新。",
  "price-deleted": "模型費率已刪除。",
};

function pageHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "error" && key !== "success" && key !== "page") query.set(key, value);
  }
  query.set("page", String(page));
  return `/admin/llm-usage?${query.toString()}`;
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function UsagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const filters = parseUsageFilters(params);
  const [dashboard, rawPrices] = await Promise.all([
    getUsageDashboard(prisma, filters),
    prisma.lLMModelPrice.findMany({ orderBy: [{ effectiveAt: "desc" }], take: 30 }),
  ]);
  const cards = [
    ["總呼叫數", number.format(dashboard.totals.calls)],
    ["成功率", dashboard.totals.successRate === null ? "—" : `${(dashboard.totals.successRate * 100).toFixed(1)}%`],
    ["輸入 Token", number.format(dashboard.totals.inputTokens)],
    ["輸出 Token", number.format(dashboard.totals.outputTokens)],
    ["估算成本（USD）", `$${Number(dashboard.totals.estimatedCostUsd).toFixed(6)}`],
  ];

  return (
    <section className="admin-grid">
      <div className="section-heading">
        <p className="eyebrow">僅 OWNER</p>
        <h1>LLM 用量管理</h1>
        <p className="muted">追蹤每次模型呼叫的 Prompt 版本、Token、成功狀態與估算成本。</p>
      </div>
      {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}
      {params.success && successMessages[params.success] ? <p className="form-success">{successMessages[params.success]}</p> : null}
      <div className="metric-grid">{cards.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <form method="get" className="panel filter-row usage-filters">
        <label>開始日期<input type="date" name="from" defaultValue={params.from || dateValue(filters.from)} /></label>
        <label>結束日期<input type="date" name="to" defaultValue={params.to || dateValue(filters.to)} /></label>
        <label>功能<select name="key" defaultValue={filters.key || ""}><option value="">全部功能</option>{dashboard.filterOptions.promptKeys.map((key) => <option key={key}>{key}</option>)}</select></label>
        <label>供應商<select name="provider" defaultValue={filters.provider || ""}><option value="">全部供應商</option>{dashboard.filterOptions.providers.map((provider) => <option key={provider}>{provider}</option>)}</select></label>
        <label>模型<select name="model" defaultValue={filters.model || ""}><option value="">全部模型</option>{dashboard.filterOptions.models.map((model) => <option key={model}>{model}</option>)}</select></label>
        <label>狀態<select name="status" defaultValue={filters.status || ""}><option value="">全部狀態</option><option value="SUCCESS">成功</option><option value="FAILURE">失敗</option></select></label>
        <button className="button button-primary" type="submit">套用篩選</button>
      </form>
      <div className="panel table-wrap">
        {dashboard.rows.length === 0 ? <p className="muted">此條件下尚無 LLM 呼叫紀錄。</p> : <table>
          <thead><tr><th>時間</th><th>功能</th><th>模型</th><th>狀態</th><th>Token</th><th>耗時</th><th>成本</th><th>錯誤</th></tr></thead>
          <tbody>{dashboard.rows.map((row) => <tr key={row.id}>
            <td>{new Date(row.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td>
            <td><strong>{row.promptName}</strong><small>{row.promptKey} · v{row.promptVersion}</small></td>
            <td><strong>{row.provider}</strong><small>{row.model}</small></td>
            <td><span className={`status ${row.status === "SUCCESS" ? "status-published" : "status-failure"}`}>{row.status === "SUCCESS" ? "成功" : "失敗"}</span></td>
            <td><span>輸入 {row.inputTokens === null ? "—" : number.format(row.inputTokens)}</span><small>輸出 {row.outputTokens === null ? "—" : number.format(row.outputTokens)}</small></td>
            <td>{number.format(row.durationMs)} ms</td>
            <td>{row.estimatedCostUsd === null ? "無法估算" : `$${Number(row.estimatedCostUsd).toFixed(6)}`}</td>
            <td>{row.errorSummary || "—"}</td>
          </tr>)}</tbody>
        </table>}
        <div className="pagination">
          {dashboard.page > 1 ? <Link className="button button-quiet" href={pageHref(params, dashboard.page - 1)}>上一頁</Link> : <span />}
          <span>第 {dashboard.page} 頁，共 {Math.max(1, Math.ceil(dashboard.totalRows / dashboard.pageSize))} 頁</span>
          {dashboard.page * dashboard.pageSize < dashboard.totalRows ? <Link className="button button-quiet" href={pageHref(params, dashboard.page + 1)}>下一頁</Link> : <span />}
        </div>
      </div>
      <ModelPriceForm prices={rawPrices.map((price) => ({
        id: price.id,
        provider: price.provider,
        model: price.model,
        inputRate: price.inputUsdPerMillionTokens.toString(),
        outputRate: price.outputUsdPerMillionTokens.toString(),
        effectiveAt: price.effectiveAt.toISOString(),
      }))} />
    </section>
  );
}
