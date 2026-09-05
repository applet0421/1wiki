import { redirect } from "next/navigation";
import { getTrafficDashboard, parseTrafficFilters } from "@/lib/analytics/traffic-query";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Params = { from?: string; to?: string; locale?: string; success?: string; error?: string };
const number = new Intl.NumberFormat("zh-TW");
const date = (value: Date) => value.toISOString().slice(0, 10);

export default async function TrafficPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const filters = parseTrafficFilters(params);
  const dashboard = await getTrafficDashboard(prisma, filters);
  const cards = [["頁面瀏覽量", number.format(dashboard.totals.views)], ["平均每日活躍使用者", number.format(dashboard.totals.activeUsers)], ["工作階段", number.format(dashboard.totals.sessions)], ["互動率", dashboard.totals.engagementRate == null ? "—" : `${(dashboard.totals.engagementRate * 100).toFixed(1)}%`], ["平均互動時間", dashboard.totals.averageEngagementSeconds == null ? "—" : `${Math.round(dashboard.totals.averageEngagementSeconds)} 秒`]];
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">GA4 · 僅 OWNER</p><h1>流量監測</h1><p className="muted">掌握每日網站表現、分類與文章流量。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success">GA4 流量資料已同步。</p> : null}
    <div className="metric-grid">{cards.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <form className="panel filter-row" method="get"><label>開始日期<input type="date" name="from" defaultValue={params.from || date(filters.from)} /></label><label>結束日期<input type="date" name="to" defaultValue={params.to || date(filters.to)} /></label><label>語系<select name="locale" defaultValue={filters.locale || ""}><option value="">全部語系</option><option value="zh-tw">繁體中文</option><option value="en">English</option><option value="ja">日本語</option></select></label><button className="button button-primary">套用篩選</button></form>
    <div className="panel"><div className="heading-row"><div><h2>每日趨勢</h2><p className="muted">每日頁面瀏覽量與活躍使用者。</p></div><form action="/api/admin/traffic/sync" method="post"><button className="button button-quiet" type="submit">立即同步 GA4</button></form></div><div className="traffic-bars">{dashboard.daily.length ? dashboard.daily.map((row) => <div className="traffic-bar-row" key={date(row.date)}><time>{date(row.date)}</time><div><span style={{ width: `${Math.max(2, dashboard.totals.views ? row.views / Math.max(...dashboard.daily.map((item) => item.views)) * 100 : 2)}%` }} /></div><strong>{number.format(row.views)}</strong></div>) : <p className="muted">尚無流量資料，請先完成 GA4 設定並同步。</p>}</div></div>
    <div className="traffic-panels"><div className="panel"><h2>熱門分類</h2>{dashboard.categories.length ? <table><thead><tr><th>分類</th><th>瀏覽量</th><th>使用者</th></tr></thead><tbody>{dashboard.categories.map((row) => <tr key={row.id}><td>{row.name}</td><td>{number.format(row.views)}</td><td>{number.format(row.activeUsers)}</td></tr>)}</tbody></table> : <p className="muted">尚無分類流量。</p>}</div><div className="panel"><h2>熱門文章</h2>{dashboard.posts.length ? <table><thead><tr><th>文章</th><th>瀏覽量</th><th>平均互動</th></tr></thead><tbody>{dashboard.posts.map((row) => <tr key={row.id}><td>{row.title}</td><td>{number.format(row.views)}</td><td>{Math.round(row.engagementSeconds)} 秒</td></tr>)}</tbody></table> : <p className="muted">尚無文章流量。</p>}</div></div>
    <p className="muted">最後同步：{dashboard.lastSync?.completedAt ? new Date(dashboard.lastSync.completedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "尚未同步"} · 狀態：{dashboard.lastSync?.status || "—"}</p>
  </section>;
}
