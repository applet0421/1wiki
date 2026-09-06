import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPublicInvalidationDashboard } from "@/lib/content/public-invalidation-dashboard";
import { retryPublicInvalidationsAction } from "./actions";

const time = (value: Date | null) => value?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) || "—";

export default async function CachePage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const [dashboard, params] = await Promise.all([getPublicInvalidationDashboard(prisma), searchParams]);
  const cloudflareConfigured = Boolean(process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">EDGE CACHE · 僅 OWNER</p><h1>快取監控</h1><p className="muted">確認公開頁面的 ISR 與 Cloudflare purge 是否正常完成。</p></div>
    {params.success === "retried" ? <p className="form-success" role="status">失效事件已重新排入處理。</p> : null}
    <div className="metric-grid">
      <div className="metric-card"><span>待處理</span><strong>{dashboard.counts.PENDING || 0}</strong></div>
      <div className="metric-card"><span>成功</span><strong>{dashboard.counts.SUCCESS || 0}</strong></div>
      <div className="metric-card"><span>失敗</span><strong>{dashboard.counts.FAILED || 0}</strong></div>
      <div className="metric-card"><span>最早待處理</span><strong>{time(dashboard.oldestPending)}</strong></div>
      <div className="metric-card"><span>Cloudflare purge</span><strong>{cloudflareConfigured ? "已設定" : "未設定"}</strong></div>
    </div>
    <div className="panel heading-row"><div><h2>操作</h2><p className="muted">失敗事件會由 cache-invalidator 重試；必要時可全部重新排隊。</p></div><form action={retryPublicInvalidationsAction}><button className="button button-quiet" type="submit">重試失敗事件</button></form></div>
    <div className="panel table-wrap"><table><thead><tr><th>建立時間</th><th>狀態</th><th>嘗試次數</th><th>路徑數</th><th>最近錯誤</th></tr></thead><tbody>{dashboard.recent.map((row) => <tr key={row.id}><td>{time(row.createdAt)}</td><td>{row.status}</td><td>{row.attempts}</td><td>{Array.isArray(row.paths) ? row.paths.length : "—"}</td><td>{row.lastError || "—"}</td></tr>)}{dashboard.recent.length === 0 ? <tr><td colSpan={5}>尚無快取失效事件。</td></tr> : null}</tbody></table></div>
  </section>;
}
