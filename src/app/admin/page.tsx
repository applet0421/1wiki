import Link from "next/link";
import { listAdminPosts } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { deletePostAction, togglePostStatusAction } from "./posts/actions";

type AdminPageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [posts, params] = await Promise.all([listAdminPosts(prisma), searchParams]);
  return (
    <section className="admin-grid">
      <div className="section-heading heading-row">
        <div><p className="eyebrow">內容中心</p><h1>文章管理</h1></div>
        <div className="heading-actions">
          <Link href="/admin/posts/rewrite" className="button button-quiet">AI 改寫文章</Link>
          <Link href="/admin/posts/new" className="button button-primary">新增文章</Link>
        </div>
      </div>
      {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}
      {params.success ? <p className="form-success">文章已儲存。</p> : null}
      <div className="panel table-wrap">
        {posts.length === 0 ? <p className="muted">尚未建立文章。</p> : (
          <table>
            <thead><tr><th>文章</th><th>分類</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>{posts.map((post) => (
              <tr key={post.id}>
                <td><strong>{post.title}</strong><small>/{post.slug}</small></td>
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
