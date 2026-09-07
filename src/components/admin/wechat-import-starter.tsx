"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWeChatImportAction } from "@/app/(backoffice)/admin/posts/wechat-actions";
import { wizardSteps } from "./wechat-wizard-types";
import styles from "./wechat-wizard.module.css";

export function WeChatImportStarter() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetLocale, setTargetLocale] = useState("zh-tw");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
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
  </form></div>;
}
