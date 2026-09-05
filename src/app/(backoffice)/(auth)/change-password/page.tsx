import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { changePasswordAction } from "./actions";
import { AdminNav } from "@/components/admin/admin-nav";

type ChangePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const message = error === "mismatch"
    ? "兩次輸入的新密碼不一致。"
    : error
      ? "目前密碼不正確，或新密碼不符合規則。"
      : null;

  return (
    <div className="admin-shell">
      <AdminNav user={user} />
      <main className="admin-main">
      <section className="admin-grid">
        <div className="section-heading"><p className="eyebrow">帳號安全</p><h1>變更密碼</h1><p className="muted">更新目前登入帳號的安全密碼。</p></div>
        <div className="panel password-panel">
        <div className="auth-card">
        <p className="muted">新密碼至少 12 個字元，並包含英文字母與數字。</p>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <form action={changePasswordAction} className="form-stack">
          <label>目前密碼<input name="currentPassword" type="password" required minLength={12} /></label>
          <label>新密碼<input name="newPassword" type="password" required minLength={12} /></label>
          <label>確認新密碼<input name="confirmation" type="password" required minLength={12} /></label>
          <button type="submit" className="button button-primary">儲存新密碼</button>
        </form>
        </div>
        </div>
      </section>
      </main>
    </div>
  );
}
