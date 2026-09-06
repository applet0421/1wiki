import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getSearchEngineSummary } from "@/lib/search-engine/repository";
import { processSearchEngineAction } from "./actions";

export default async function SearchEnginePage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const summary = await getSearchEngineSummary(prisma);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">SEO · 僅 OWNER</p><h1>搜尋引擎</h1><p className="muted">管理 sitemap 與 Bing IndexNow 自動通知。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success" role="status">搜尋引擎通知處理完成。</p> : null}
    <div className="metric-grid"><div className="metric-card"><span>Sitemap</span><strong>可用</strong></div><div className="metric-card"><span>Bing 待處理</span><strong>{summary.pending}</strong></div><div className="metric-card"><span>Bing 成功</span><strong>{summary.success}</strong></div><div className="metric-card"><span>GSC 待處理</span><strong>{summary.google.pending}</strong></div><div className="metric-card"><span>GSC 成功</span><strong>{summary.google.success}</strong></div></div>
    <div className="panel"><div className="heading-row"><div><h2>自動通知</h2><p className="muted">發布、更新或下架文章時會自動加入 Bing IndexNow 與 Google sitemap 提交佇列。</p><p className="muted">Sitemap：{siteUrl}/sitemap.xml</p></div><form action={processSearchEngineAction}><button className="button button-primary">立即處理通知</button></form></div></div>
    <div className="panel table-wrap"><table><thead><tr><th>建立時間</th><th>搜尋引擎</th><th>事件</th><th>狀態</th><th>URL</th><th>錯誤</th></tr></thead><tbody>{summary.recent.map((row) => <tr key={row.id}><td>{row.createdAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td><td>{row.engine}</td><td>{row.eventType}</td><td>{row.status}</td><td><small>{row.url}</small></td><td>{row.lastError || "—"}</td></tr>)}</tbody></table></div>
  </section>;
}
