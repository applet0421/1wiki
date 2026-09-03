import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/admin");
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand-mark">1Wiki</Link>
        <p className="eyebrow">內容管理</p>
        <h1>登入後台</h1>
        <p className="muted">使用由 OWNER 建立的管理帳號登入。</p>
        {error ? <p className="form-error" role="alert">帳號或密碼不正確，或帳號暫時無法登入。</p> : null}
        <form action={loginAction} className="form-stack">
          <label>
            帳號
            <input name="username" autoComplete="username" required minLength={3} />
          </label>
          <label>
            密碼
            <input name="password" type="password" autoComplete="current-password" required minLength={12} />
          </label>
          <button type="submit" className="button button-primary">登入</button>
        </form>
        <Link href="/" className="text-link">返回公開網站</Link>
      </div>
    </main>
  );
}
