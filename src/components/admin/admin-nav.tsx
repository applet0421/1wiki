import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session-core";
import { logoutAction } from "@/app/(backoffice)/(auth)/login/actions";

export function AdminNav({ user }: { user: SessionUser }) {
  return (
    <header className="admin-header">
      <Link href="/admin" className="brand-mark">1Wiki 管理</Link>
      <nav aria-label="後台導覽">
        <Link href="/admin">文章</Link>
        <Link href="/admin/categories">分類</Link>
        {user.role === "OWNER" ? (
          <>
            <Link href="/admin/prompts">Prompt 管理</Link>
            <Link href="/admin/llm-usage">LLM 用量</Link>
            <Link href="/admin/worker">Worker 監控</Link>
            <Link href="/admin/users">帳號</Link>
          </>
        ) : null}
        <Link href="/change-password">密碼</Link>
      </nav>
      <div className="admin-user">
        <span>{user.displayName}</span>
        <form action={logoutAction}><button type="submit" className="button button-quiet">登出</button></form>
      </div>
    </header>
  );
}
