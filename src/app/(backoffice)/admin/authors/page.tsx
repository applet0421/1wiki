import Link from "next/link";
import { listAuthors } from "@/lib/content/authors";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, isLocale, getLocaleConfig, supportedLocales } from "@/lib/i18n/config";
import { archiveAuthorAction } from "./actions";

const messages: Record<string, string> = { saved: "作者已儲存。", archived: "作者已封存，既有文章署名與作者頁會保留。", restored: "作者已恢復使用。" };

export default async function AuthorsPage({ searchParams }: { searchParams: Promise<{ locale?: string; status?: string; error?: string; success?: string }> }) {
  const query = await searchParams;
  const locale = query.locale && isLocale(query.locale) ? query.locale : defaultLocale;
  const status = query.status === "archived" || query.status === "active" ? query.status : "all";
  const authors = await listAuthors(prisma, locale, status);
  return <section className="admin-grid">
    <div className="author-library-heading section-heading"><div><p className="eyebrow">內容團隊</p><h1>作者庫</h1><p className="muted">依語言管理文章作者與介紹頁。封存後，既有文章的署名仍會保留。</p></div><Link className="button button-primary" href={`/admin/authors/new?locale=${locale}`}>新增作者</Link></div>
    {query.error ? <p role="alert" className="form-error">{query.error}</p> : query.success && messages[query.success] ? <p role="status" className="form-success">{messages[query.success]}</p> : null}
    <form method="get" className="panel filter-row">
      <label>內容語系<select name="locale" defaultValue={locale}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      <label>狀態<select name="status" defaultValue={status}><option value="all">全部作者</option><option value="active">使用中</option><option value="archived">已封存</option></select></label>
      <button type="submit" className="button button-quiet">套用篩選</button>
    </form>
    {authors.length ? <div className="panel table-wrap"><table><thead><tr><th>作者</th><th>語言</th><th>文章數</th><th>狀態</th><th>操作</th></tr></thead><tbody>{authors.map((author) => <tr key={author.id}>
      <td><Link href={`/admin/authors/${author.id}`}><strong>{author.name}</strong></Link><div className="muted">{author.slug}</div></td><td>{getLocaleConfig(locale).label}</td><td>{author._count.posts}</td><td>{author.archivedAt ? "已封存" : "使用中"}</td>
      <td><div className="author-row-actions"><Link href={`/admin/authors/${author.id}`}>編輯</Link><Link href={`/${locale}/authors/${author.slug}`} target="_blank" rel="noopener noreferrer">查看頁面 ↗</Link><form action={archiveAuthorAction}><input type="hidden" name="id" value={author.id} /><input type="hidden" name="locale" value={locale} /><button type="submit" name="intent" value={author.archivedAt ? "restore" : "archive"} className="button button-quiet">{author.archivedAt ? "恢復使用" : "封存"}</button></form></div></td>
    </tr>)}</tbody></table></div> : <div className="panel"><h2>此語系尚無{status === "archived" ? "已封存" : status === "active" ? "使用中" : ""}作者</h2><p className="muted">新增作者後，即可在相同語系的文章編輯器中選取。</p></div>}
  </section>;
}
