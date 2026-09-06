import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session-core";
import { logoutAction } from "@/app/(backoffice)/(auth)/login/actions";

export function AdminNav({ user }: { user: SessionUser }) {
  return (
    <aside className="admin-header admin-sidebar">
      <Link href="/admin" className="brand-mark">1Wiki 管理</Link>
      <nav aria-label="後台導覽">
        <Link href="/admin">文章</Link>
        <Link href="/admin/pages">網站頁面</Link>
        <Link href="/admin/posts/create">文章生成</Link>
        <Link href="/admin/categories">分類</Link>
        <Link href="/admin/authors">作者庫</Link>
        {user.role === "OWNER" ? (
          <>
            <Link href="/admin/prompts">Prompt 管理</Link>
            <Link href="/admin/llm-usage">LLM 用量</Link>
            <Link href="/admin/traffic">流量監測</Link>
            <Link href="/admin/search-engine">搜尋引擎</Link>
            <Link href="/admin/worker">Worker 監控</Link>
            <Link href="/admin/cache">快取監控</Link>
            <Link href="/admin/database-backups">數據庫備份</Link>
            <Link href="/admin/users">帳號</Link>
          </>
        ) : null}
        <Link href="/change-password">密碼</Link>
      </nav>
      <div className="admin-user">
        <span>{user.displayName}</span>
        <form action={logoutAction}><button type="submit" className="button button-quiet">登出</button></form>
      </div>
    </aside>
  );
}
