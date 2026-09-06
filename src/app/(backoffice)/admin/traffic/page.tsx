import { redirect } from "next/navigation";
import { getTrafficDashboard, parseTrafficFilters } from "@/lib/analytics/traffic-query";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Params = { locale?: string; success?: string; error?: string };
const number = new Intl.NumberFormat("zh-TW");

export default async function TrafficPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const filters = parseTrafficFilters(params);
  const dashboard = await getTrafficDashboard(prisma, filters);
  const cards = [["累計頁面瀏覽量", number.format(dashboard.totals.views)]];
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">GA4 · 僅 OWNER</p><h1>流量監測</h1><p className="muted">掌握文章與分類的累計頁面瀏覽量。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success">GA4 流量資料已同步。</p> : null}
    <div className="metric-grid">{cards.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="panel heading-row"><div><h2>頁面瀏覽量</h2><p className="muted">依累計瀏覽量排列，不保存每日明細。</p></div><form action="/api/admin/traffic/sync" method="post"><button className="button button-quiet">立即同步 GA4</button></form></div>
    <div className="traffic-panels"><div className="panel"><h2>熱門分類</h2>{dashboard.categories.length ? <table><thead><tr><th>分類</th><th>累計瀏覽量</th></tr></thead><tbody>{dashboard.categories.map((row) => <tr key={row.id}><td>{row.name}</td><td>{number.format(row.views)}</td></tr>)}</tbody></table> : <p className="muted">尚無分類流量。</p>}</div><div className="panel"><h2>熱門文章</h2>{dashboard.posts.length ? <table><thead><tr><th>文章</th><th>累計瀏覽量</th></tr></thead><tbody>{dashboard.posts.map((row) => <tr key={row.id}><td>{row.title}</td><td>{number.format(row.views)}</td></tr>)}</tbody></table> : <p className="muted">尚無文章流量。</p>}</div></div>
    <p className="muted">最後同步：{dashboard.lastSync?.completedAt ? new Date(dashboard.lastSync.completedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "尚未同步"} · 狀態：{dashboard.lastSync?.status || "—"}</p>
  </section>;
}
