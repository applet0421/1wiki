import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { listAdminSitePages } from "@/lib/content/pages";
import { defaultLocale, getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
import { deleteSitePageAction, toggleSitePageStatusAction } from "./actions";

export default async function SitePagesPage({ searchParams }: { searchParams: Promise<{ locale?: string; error?: string; success?: string }> }) {
  const query = await searchParams;
  const locale = query.locale && isLocale(query.locale) ? query.locale : defaultLocale;
  const pages = await listAdminSitePages(prisma, query.locale === "all" ? undefined : locale);
  return <section className="admin-grid">
    <div className="section-heading heading-row"><div><p className="eyebrow">網站內容</p><h1>網站頁面</h1><p className="muted">管理 About、隱私權政策、聯繫我們等非文章頁面。</p></div><Link href={`/admin/pages/new?locale=${locale}`} className="button button-primary">新增頁面</Link></div>
    {query.error ? <p className="form-error" role="alert">{query.error}</p> : query.success === "deleted" ? <p className="form-success">網站頁面已刪除。</p> : query.success ? <p className="form-success">網站頁面已儲存。</p> : null}
    <form method="get" className="panel filter-row"><label>內容語系<select name="locale" defaultValue={query.locale || locale}><option value="all">全部語系</option>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label><button className="button button-quiet" type="submit">篩選</button></form>
    <div className="panel table-wrap">{pages.length === 0 ? <p className="muted">尚未建立網站頁面。</p> : <table><thead><tr><th>頁面</th><th>語系</th><th>狀態</th><th>更新時間</th><th>操作</th></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td><strong>{page.title}</strong><small>/{page.slug}</small></td><td>{isLocale(page.locale) ? getLocaleConfig(page.locale).label : page.locale}</td><td><span className={`status status-${page.status.toLowerCase()}`}>{page.status === "PUBLISHED" ? "已發布" : "草稿"}</span></td><td>{page.updatedAt.toLocaleDateString("zh-TW")}</td><td><div className="row-actions"><Link className="button button-quiet" href={`/admin/pages/${page.id}`}>編輯</Link>{page.status === "PUBLISHED" ? <Link className="button button-quiet" href={`/${page.locale}/${page.slug}`} target="_blank" rel="noreferrer">查看</Link> : null}<form action={toggleSitePageStatusAction}><input type="hidden" name="id" value={page.id} /><input type="hidden" name="status" value={page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} /><button className="button button-quiet" type="submit">{page.status === "PUBLISHED" ? "撤回" : "發布"}</button></form><form action={deleteSitePageAction}><input type="hidden" name="id" value={page.id} /><button className="button button-danger" type="submit">刪除</button></form></div></td></tr>)}</tbody></table>}</div>
  </section>;
}
