import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserForm } from "@/components/admin/user-form";
import { resetPasswordAction, updateUserAction } from "./actions";

type UsersPageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, role: true, isActive: true, mustChangePassword: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <section className="admin-grid">
      <div className="section-heading">
        <p className="eyebrow">僅 OWNER</p><h1>後台帳號</h1>
        {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}
        {params.success ? <p className="form-success">帳號設定已更新。</p> : null}
      </div>
      <UserForm />
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>帳號</th><th>名稱</th><th>角色與狀態</th><th>重設密碼</th></tr></thead>
          <tbody>{users.map((account) => (
            <tr key={account.id}>
              <td>{account.username}{account.mustChangePassword ? <small>需變更密碼</small> : null}</td>
              <td>{account.displayName}</td>
              <td>
                <form action={updateUserAction} className="inline-form">
                  <input type="hidden" name="id" value={account.id} />
                  <select name="role" defaultValue={account.role}><option value="EDITOR">EDITOR</option><option value="OWNER">OWNER</option></select>
                  <select name="isActive" defaultValue={String(account.isActive)}><option value="true">啟用</option><option value="false">停用</option></select>
                  <button className="button button-quiet" type="submit">更新</button>
                </form>
              </td>
              <td>
                <form action={resetPasswordAction} className="inline-form">
                  <input type="hidden" name="id" value={account.id} />
                  <input name="temporaryPassword" type="password" placeholder="12 字元以上" required minLength={12} />
                  <button className="button button-quiet" type="submit">重設</button>
                </form>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
