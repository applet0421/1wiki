import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { changePasswordAction } from "./actions";

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
    <main className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">帳號安全</p>
        <h1>變更密碼</h1>
        <p className="muted">新密碼至少 12 個字元，並包含英文字母與數字。</p>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <form action={changePasswordAction} className="form-stack">
          <label>目前密碼<input name="currentPassword" type="password" required minLength={12} /></label>
          <label>新密碼<input name="newPassword" type="password" required minLength={12} /></label>
          <label>確認新密碼<input name="confirmation" type="password" required minLength={12} /></label>
          <button type="submit" className="button button-primary">儲存新密碼</button>
        </form>
      </div>
    </main>
  );
}
