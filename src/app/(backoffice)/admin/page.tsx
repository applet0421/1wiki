import Link from "next/link";
import { listAdminPosts, listCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { deletePostAction, togglePostStatusAction } from "./posts/actions";
import { getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
import { PostFilters } from "@/components/admin/post-filters";

type AdminPageProps = { searchParams: Promise<{ error?: string; success?: string; locale?: string; category?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const locale = params.locale && isLocale(params.locale) ? params.locale : undefined;
  const listedCategories = await listCategories(prisma);
  const categories = locale
    ? listedCategories.filter((item) => item.locale === locale)
    : listedCategories;
  const category = params.category && categories.some((item) => item.id === params.category)
    ? params.category
    : undefined;
  const posts = await listAdminPosts(prisma, locale, category);
  return (
    <section className="admin-grid">
      <div className="section-heading heading-row">
        <div><p className="eyebrow">內容中心</p><h1>文章管理</h1></div>
        <div className="heading-actions">
          <Link href="/admin/posts/generate" className="button button-quiet">AI 生成</Link>
          <Link href="/admin/posts/rewrite" className="button button-quiet">AI 改寫文章</Link>
          <Link href="/admin/posts/new" className="button button-primary">新增文章</Link>
        </div>
      </div>
      {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}
      {params.success ? <p className="form-success">文章已儲存。</p> : null}
      <PostFilters
        categories={listedCategories.map((item) => ({ id: item.id, locale: item.locale as (typeof supportedLocales)[number], name: item.name }))}
        initialLocale={locale}
        initialCategory={category}
      />
      <div className="panel table-wrap">
        {posts.length === 0 ? <p className="muted">尚未建立文章。</p> : (
          <table>
            <thead><tr><th>文章</th><th>語系</th><th>分類</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>{posts.map((post) => (
              <tr key={post.id}>
                <td><strong>{post.title}</strong><small>/{post.slug}</small></td>
                <td>{getLocaleConfig(post.locale as (typeof supportedLocales)[number]).label}</td>
                <td>{post.category.name}</td>
                <td><span className={`status status-${post.status.toLowerCase()}`}>{post.status === "PUBLISHED" ? "已發布" : "草稿"}</span></td>
                <td><div className="row-actions">
                  <Link className="button button-quiet" href={`/admin/posts/${post.id}`}>編輯</Link>
                  <form action={togglePostStatusAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="status" value={post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"} /><button className="button button-quiet" type="submit">{post.status === "PUBLISHED" ? "撤回" : "發布"}</button></form>
                  <form action={deletePostAction}><input type="hidden" name="id" value={post.id} /><button className="button button-danger" type="submit">刪除</button></form>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
