import { listCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { createCategoryAction, deleteCategoryAction } from "./actions";
type Props = { searchParams: Promise<{ error?: string; success?: string }> };
export default async function CategoriesPage({ searchParams }: Props) {
  const [categories, params] = await Promise.all([listCategories(prisma), searchParams]);
  return <section className="admin-grid">
    <div><p className="eyebrow">內容架構</p><h1>分類管理</h1></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success">分類已建立。</p> : null}
    <form action={createCategoryAction} className="panel form-grid"><h2 className="span-2">建立分類</h2><label>名稱<input name="name" required maxLength={80} /></label><label>網址代稱<input name="slug" maxLength={160} /></label><label className="span-2">說明<textarea name="description" maxLength={300} rows={3} /></label><button className="button button-primary" type="submit">建立分類</button></form>
    <div className="card-grid">{categories.map((category) => <article className="panel" key={category.id}><p className="eyebrow">/{category.slug}</p><h2>{category.name}</h2><p className="muted">{category.description || "尚無說明"}</p><p>{category._count.posts} 篇文章</p><form action={deleteCategoryAction}><input type="hidden" name="id" value={category.id} /><button className="button button-danger" type="submit">刪除</button></form></article>)}</div>
  </section>;
}
