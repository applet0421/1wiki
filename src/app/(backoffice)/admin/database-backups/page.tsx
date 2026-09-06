import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateBackupSettings, listDatabaseBackups, serializeBackup } from "@/lib/backup/repository";
import { getOrCreateRetentionSettings } from "@/lib/retention/settings";
import { createManualBackupAction, downloadBackupAction, saveBackupSettingsAction, saveRetentionSettingsAction } from "./actions";

const time = (value: Date | null) => value?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) || "—";
const size = (value: number | null) => value === null ? "—" : `${(value / 1024 / 1024).toFixed(1)} MB`;

export default async function DatabaseBackupsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const [settings, retentionSettings, rows, params] = await Promise.all([getOrCreateBackupSettings(prisma), getOrCreateRetentionSettings(prisma), listDatabaseBackups(prisma), searchParams]);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">DATABASE BACKUP · 僅 OWNER</p><h1>數據庫備份</h1><p className="muted">每日將 PostgreSQL 數據庫壓縮後存放至私有 Cloudflare R2。備份檔不加密，下載使用限時簽名連結。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success" role="status">{params.success === "started" ? "手動備份已排入處理。" : params.success === "retention-settings" ? "資料清理設定已儲存。" : "備份設定已儲存。"}</p> : null}
    <div className="panel"><div className="heading-row"><div><h2>排程設定</h2><p className="muted">Worker 會在每日指定時間執行一次；保留數量只計算成功備份。</p></div><form action={createManualBackupAction}><button className="button button-primary" type="submit">立即備份</button></form></div><form action={saveBackupSettingsAction} className="form-grid">
      <label className="checkbox-field"><input type="checkbox" name="enabled" defaultChecked={settings.enabled} />啟用每日備份</label>
      <label>每日時間<input type="time" name="dailyTime" defaultValue={settings.dailyTime} required /></label>
      <label>時區<input name="timezone" defaultValue={settings.timezone} required /></label>
      <label>R2 保留數量<input type="number" name="retentionCount" min={1} max={365} defaultValue={settings.retentionCount} required /><span className="field-help">超過數量的最舊成功備份會被刪除。</span></label>
      <div><button className="button button-quiet" type="submit">儲存設定</button></div>
    </form></div>
    <div className="panel"><div className="heading-row"><div><h2>資料清理保留期限</h2><p className="muted">每日由 database-backup-worker 執行；核心文章與設定資料不會自動刪除。單位為天，範圍 1–3650 天。</p></div></div><form action={saveRetentionSettingsAction} className="form-grid retention-settings-form">
      <label>LLM 用量<input type="number" name="llmUsageDays" min={1} max={3650} defaultValue={retentionSettings.llmUsageDays} required /><span className="field-help">成功與失敗的模型呼叫紀錄。</span></label>
      <label>流量頁面明細<input type="number" name="trafficDailyPageDays" min={1} max={3650} defaultValue={retentionSettings.trafficDailyPageDays} required /><span className="field-help">每日頁面流量資料。</span></label>
      <label>流量網站彙總<input type="number" name="trafficDailySiteDays" min={1} max={3650} defaultValue={retentionSettings.trafficDailySiteDays} required /></label>
      <label>流量同步執行紀錄<input type="number" name="trafficSyncRunDays" min={1} max={3650} defaultValue={retentionSettings.trafficSyncRunDays} required /></label>
      <label>搜尋成功通知<input type="number" name="searchSuccessDays" min={1} max={3650} defaultValue={retentionSettings.searchSuccessDays} required /></label>
      <label>搜尋失敗通知<input type="number" name="searchFailureDays" min={1} max={3650} defaultValue={retentionSettings.searchFailureDays} required /></label>
      <label>AI 配圖任務<input type="number" name="imageGenerationDays" min={1} max={3650} defaultValue={retentionSettings.imageGenerationDays} required /><span className="field-help">仍含原始圖片的任務不會自動刪除。</span></label>
      <label>快取失效失敗事件<input type="number" name="publicInvalidationDays" min={1} max={3650} defaultValue={retentionSettings.publicInvalidationDays} required /></label>
      <label>備份失敗／卡住紀錄<input type="number" name="databaseBackupFailureDays" min={1} max={3650} defaultValue={retentionSettings.databaseBackupFailureDays} required /></label>
      <div><button className="button button-quiet" type="submit">儲存清理設定</button></div>
    </form></div>
    <div className="panel table-wrap"><table><thead><tr><th>建立時間</th><th>觸發方式</th><th>狀態</th><th>大小</th><th>完成時間</th><th>操作</th></tr></thead><tbody>{rows.map((row) => { const item = serializeBackup(row); return <tr key={item.id}><td>{time(item.createdAt)}</td><td>{item.trigger === "SCHEDULE" ? "每日排程" : "手動"}</td><td>{item.status}</td><td>{size(item.fileSize)}</td><td>{time(item.completedAt)}</td><td>{item.status === "SUCCESS" ? <form action={downloadBackupAction}><input type="hidden" name="id" value={item.id} /><button className="button button-quiet" type="submit">下載</button></form> : item.error || "—"}</td></tr>; })}{rows.length === 0 ? <tr><td colSpan={6}>尚無備份紀錄。</td></tr> : null}</tbody></table></div>
  </section>;
}
