import { createUserAction } from "@/app/admin/users/actions";

export function UserForm() {
  return (
    <form action={createUserAction} className="panel form-stack">
      <h2>建立後台帳號</h2>
      <label>帳號<input name="username" required minLength={3} maxLength={50} /></label>
      <label>顯示名稱<input name="displayName" required maxLength={80} /></label>
      <label>臨時密碼<input name="temporaryPassword" type="password" required minLength={12} /></label>
      <label>角色<select name="role" defaultValue="EDITOR"><option value="EDITOR">EDITOR</option><option value="OWNER">OWNER</option></select></label>
      <button type="submit" className="button button-primary">建立帳號</button>
    </form>
  );
}
