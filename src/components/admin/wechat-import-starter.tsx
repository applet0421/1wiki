"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWeChatImportAction } from "@/app/(backoffice)/admin/posts/wechat-actions";

export function WeChatImportStarter() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetLocale, setTargetLocale] = useState("zh-tw");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <form className="panel form-grid" onSubmit={(event) => {
    event.preventDefault(); setError("");
    startTransition(async () => {
      const result = await createWeChatImportAction({ sourceUrl, targetLocale });
      if (!result.ok) { setError(result.error); return; }
      router.push(`/admin/posts/wechat/${result.importId}`);
    });
  }}>
    <legend>公開微信文章連結</legend>
    <p className="muted span-2">僅支援可公開瀏覽的 <code>https://mp.weixin.qq.com/s/…</code> 文章；不使用登入或繞過驗證。</p>
    <label className="span-2">文章連結<input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://mp.weixin.qq.com/s/..." /></label>
    <label>目標語言<select value={targetLocale} onChange={(event) => setTargetLocale(event.target.value)}><option value="zh-tw">繁體中文</option><option value="en">English</option><option value="ja">日本語</option></select></label>
    <div className="editor-actions"><button className="button button-primary" disabled={pending}>{pending ? "建立中…" : "開始擷取"}</button></div>
    {error ? <p className="form-error span-2" role="alert">{error}</p> : null}
  </form>;
}
