import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateBackupSettings, listDatabaseBackups, serializeBackup } from "@/lib/backup/repository";
import { createManualBackupAction, downloadBackupAction, saveBackupSettingsAction } from "./actions";

const time = (value: Date | null) => value?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) || "—";
const size = (value: number | null) => value === null ? "—" : `${(value / 1024 / 1024).toFixed(1)} MB`;

export default async function DatabaseBackupsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const [settings, rows, params] = await Promise.all([getOrCreateBackupSettings(prisma), listDatabaseBackups(prisma), searchParams]);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">DATABASE BACKUP · 僅 OWNER</p><h1>數據庫備份</h1><p className="muted">每日將 PostgreSQL 數據庫壓縮後存放至私有 Cloudflare R2。備份檔不加密，下載使用限時簽名連結。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success" role="status">{params.success === "started" ? "手動備份已排入處理。" : "備份設定已儲存。"}</p> : null}
    <div className="panel"><div className="heading-row"><div><h2>排程設定</h2><p className="muted">Worker 會在每日指定時間執行一次；保留數量只計算成功備份。</p></div><form action={createManualBackupAction}><button className="button button-primary" type="submit">立即備份</button></form></div><form action={saveBackupSettingsAction} className="form-grid">
      <label className="checkbox-field"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} />啟用每日備份</label>
      <label>每日時間<input type="time" name="dailyTime" defaultValue={settings.dailyTime} required /></label>
      <label>時區<input name="timezone" defaultValue={settings.timezone} required /></label>
      <label>R2 保留數量<input type="number" name="retentionCount" min={1} max={365} defaultValue={settings.retentionCount} required /><span className="field-help">超過數量的最舊成功備份會被刪除。</span></label>
      <div><button className="button button-quiet" type="submit">儲存設定</button></div>
    </form></div>
    <div className="panel table-wrap"><table><thead><tr><th>建立時間</th><th>觸發方式</th><th>狀態</th><th>大小</th><th>完成時間</th><th>操作</th></tr></thead><tbody>{rows.map((row) => { const item = serializeBackup(row); return <tr key={item.id}><td>{time(item.createdAt)}</td><td>{item.trigger === "SCHEDULE" ? "每日排程" : "手動"}</td><td>{item.status}</td><td>{size(item.fileSize)}</td><td>{time(item.completedAt)}</td><td>{item.status === "SUCCESS" ? <form action={downloadBackupAction}><input type="hidden" name="id" value={item.id} /><button className="button button-quiet" type="submit">下載</button></form> : item.error || "—"}</td></tr>; })}{rows.length === 0 ? <tr><td colSpan={6}>尚無備份紀錄。</td></tr> : null}</tbody></table></div>
  </section>;
}
