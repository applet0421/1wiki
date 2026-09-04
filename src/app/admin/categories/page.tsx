import { listCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import { defaultLocale, getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
type Props = { searchParams: Promise<{ error?: string; success?: string; locale?: string }> };
export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  const categories = await listCategories(prisma, locale);
  return <section className="admin-grid">
    <div><p className="eyebrow">內容架構</p><h1>分類管理</h1></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success">分類已建立。</p> : null}
    <form method="get" className="panel filter-row"><label>內容語系<select name="locale" defaultValue={locale}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label><button className="button button-quiet" type="submit">篩選</button></form>
    <form action={createCategoryAction} className="panel form-grid"><h2 className="span-2">建立分類</h2><input type="hidden" name="locale" value={locale} /><label>名稱<input name="name" required maxLength={80} /></label><label>網址代稱<input name="slug" maxLength={160} /></label><label className="span-2">說明<textarea name="description" maxLength={300} rows={3} /></label><button className="button button-primary" type="submit">建立分類</button></form>
    <div className="card-grid">{categories.map((category) => <article className="panel" key={category.id}><p className="eyebrow">/{category.slug}</p><h2>{category.name}</h2><p className="muted">{category.description || "尚無說明"}</p><p>{category._count.posts} 篇文章</p><form action={deleteCategoryAction}><input type="hidden" name="id" value={category.id} /><button className="button button-danger" type="submit">刪除</button></form></article>)}</div>
  </section>;
}
