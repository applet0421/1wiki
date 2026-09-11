"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWeChatImportAction, resetAllWeChatImportsAction } from "@/app/(backoffice)/admin/posts/wechat-actions";
import { wizardSteps } from "./wechat-wizard-types";
import styles from "./wechat-wizard.module.css";

export function WeChatImportStarter() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetLocale, setTargetLocale] = useState("zh-tw");
  const [error, setError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();
  function resetAllStaging() {
    setError("");
    startTransition(async () => {
      try {
        const result = await resetAllWeChatImportsAction();
        if (!result.ok) { setError(result.error); return; }
        setConfirmReset(false);
        setResetNotice(result.cleared ? `已安全清除 ${result.cleared} 筆未完成的微信暫存工作。` : "目前沒有可清除的未完成微信暫存工作。");
      } catch { setError("無法完成暫存清理，請重新整理後再試。"); }
    });
  }
  return <div className={styles.workspace}><nav aria-label="匯入步驟"><ol className={styles.steps}>{wizardSteps.map((label, index) => <li key={label}><span className={styles.stepItem} aria-current={index === 0 ? "step" : undefined}><span className={styles.stepNumber}>{index + 1}</span>{label}</span></li>)}</ol></nav><form className={`${styles.card} form-grid`} onSubmit={(event) => {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try {
        const result = await createWeChatImportAction({ sourceUrl, targetLocale });
        if (!result.ok) { setError(result.error); return; }
        router.push(`/admin/posts/wechat/${result.importId}`);
      } catch { setError("無法建立匯入，請確認連線後重試。"); }
    });
  }}>
    <h2 className="span-2">1. 輸入微信文章連結</h2>
    <p className="muted span-2">僅支援可公開瀏覽的 <code>https://mp.weixin.qq.com/s/…</code> 文章；不使用登入或繞過驗證。</p>
    <label className="span-2">文章連結<input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://mp.weixin.qq.com/s/..." /></label>
    <label>目標語言<select value={targetLocale} onChange={(event) => setTargetLocale(event.target.value)}><option value="zh-tw">繁體中文</option><option value="en">English</option><option value="ja">日本語</option></select></label>
    <p className={`${styles.warning} span-2`}>建立後 30 分鐘會清除未完成的抓取暫存。請在期限內完成審閱與轉存；重新整理或返回步驟不會延長期限。</p>
    <div className="editor-actions"><button className="button button-primary" disabled={pending}>{pending ? "建立中…" : "開始擷取"}</button></div>
    {error ? <p className="form-error span-2" role="alert">{error}</p> : null}
  </form><section className={styles.card}><h2>清除未完成暫存</h2><p className={styles.notice}>只會清除你尚未完成且未建立文章的微信匯入工作、原文、草稿與資料庫圖片暫存；不影響已轉存 R2 圖片、已完成工作或已發布文章。</p>{confirmReset ? <div role="alertdialog" aria-modal="false" aria-labelledby="wechat-reset-title"><h3 id="wechat-reset-title">確定重置所有微信暫存工作？</h3><p>此操作無法復原，進行中的 Worker 工作也會停止後續處理。</p><div className="editor-actions"><button type="button" className="button button-quiet" disabled={pending} onClick={() => setConfirmReset(false)}>取消</button><button type="button" className={styles.dangerButton} disabled={pending} onClick={resetAllStaging}>{pending ? "清理中…" : "確認重置"}</button></div></div> : <button type="button" className={styles.dangerButton} disabled={pending} onClick={() => setConfirmReset(true)}>重置所有微信暫存</button>}{resetNotice ? <p className={styles.success} role="status">{resetNotice}</p> : null}</section></div>;
}
