"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abandonWeChatImportAction, queueWeChatRetryAction, queueWeChatRewriteAction, queueWeChatTransferAction } from "@/app/(backoffice)/admin/posts/wechat-actions";
import { WeChatArticlePreview, WeChatPreviewImage } from "./wechat-article-preview";
import { activeImportStatuses, initialWizardStep, importStatusLabels, wizardSteps, type WeChatImportView } from "./wechat-wizard-types";
import styles from "./wechat-wizard.module.css";

const languageNames: Record<string, string> = { "zh-tw": "繁體中文（台灣）", en: "English", ja: "日本語" };

export function WeChatImportWorkspace({ imported }: { imported: WeChatImportView }) {
  const router = useRouter();
  const [step, setStep] = useState(() => initialWizardStep(imported.status, imported.failureStage));
  const [tab, setTab] = useState<"rewrite" | "original" | "compare">("rewrite");
  const [mode, setMode] = useState(imported.rewriteMode);
  const [locale, setLocale] = useState(imported.targetLocale);
  const [instructions, setInstructions] = useState(imported.rewriteInstructions);
  const [reviewed, setReviewed] = useState(false);
  const [coverId, setCoverId] = useState(imported.assets.find((asset) => asset.isCover)?.id || "");
  const [draft, setDraft] = useState(imported.rewrittenDraft);
  const [revision] = useState(imported.updatedAt);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"abandon" | "rewrite" | "retry" | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const confirmationPanel = useRef<HTMLElement>(null);
  const [now, setNow] = useState(() => Date.parse(imported.serverNow));
  const busy = activeImportStatuses.has(imported.status);
  const ready = imported.status === "READY";
  const remaining = Math.max(0, Date.parse(imported.expiresAt) - now);
  const expired = imported.status === "EXPIRED" || (!remaining && !ready);
  const abandoned = imported.status === "ABANDONED";
  const unavailable = expired || abandoned;
  const failed = ["FAILED", "UNKNOWN", "TRANSFER_FAILED"].includes(imported.status);
  const cover = imported.assets.find((asset) => asset.id === coverId);
  const images = draft?.blocks.filter((block) => block.type === "image") || [];
  const missingImages = images.filter((block) => !imported.assets.some((asset) => asset.id === block.assetId && ["STAGED", "READY"].includes(asset.status))).length;
  const uploaded = imported.assets.filter((asset) => asset.status === "READY").length;
  const workerOffline = !imported.worker || imported.worker.desiredState === "STOPPED" || now - Date.parse(imported.worker.lastHeartbeat) > 90_000;
  const hasOriginal = !!(imported.sourceBlocks.length || imported.sourceContentHtml);
  const canRewrite = ["FETCHED", "REWRITTEN"].includes(imported.status) && !unavailable;
  const simplifiedWarning = imported.targetLocale === "zh-tw" && !!draft && /[这为发后国网图设页与说实转过个时会应开关写语体]/u.test([draft.title, draft.excerpt, draft.seoTitle, draft.seoDescription, ...draft.blocks.map((block) => block.type === "text" ? block.html.replace(/<[^>]*>/g, "") : block.alt)].join(""));

  useEffect(() => {
    if (!confirm) return;
    confirmationPanel.current?.focus({ preventScroll: true });
    confirmationPanel.current?.scrollIntoView?.({ block: "center" });
  }, [confirm]);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setNow(Date.parse(imported.serverNow) + Date.now() - started), 1000);
    return () => window.clearInterval(timer);
  }, [imported.serverNow]);
  useEffect(() => {
    if (ready || abandoned || imported.status === "EXPIRED") return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [imported.status, ready, abandoned, router]);

  function execute(action: () => Promise<{ ok: boolean; error?: string }>) {
    if (submitting.current) return;
    submitting.current = true;
    setError(""); setConfirm(null);
    startTransition(async () => {
      try { const result = await action(); if (!result.ok) setError(result.error || "操作未完成，請重試。"); else router.refresh(); }
      catch { setError("無法連線，請重新整理確認工作狀態後再操作。"); }
      finally { submitting.current = false; }
    });
  }
  function rewrite() { execute(() => queueWeChatRewriteAction(imported.id, mode, { targetLocale: locale, instructions })); }
  function transfer() {
    if (!draft || !reviewed || missingImages) return;
    execute(() => queueWeChatTransferAction(imported.id, { title: draft.title, excerpt: draft.excerpt, slug: draft.slug, seoTitle: draft.seoTitle, seoDescription: draft.seoDescription, seoKeywords: draft.seoKeywords, coverAssetId: coverId, revision }));
  }
  function edit(field: "title" | "excerpt" | "slug" | "seoTitle" | "seoDescription" | "seoKeywords", value: string) { setDraft((current) => current ? { ...current, [field]: value } : null); setReviewed(false); }
  function canView(value: number) { return !unavailable && (value === 1 || value === step || value === 2 && hasOriginal || value === 3 && hasOriginal && !busy && canRewrite || value === 4 && !!draft || value === 5 && ["TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "READY"].includes(imported.status)); }
  const originalPreview = <WeChatArticlePreview title={imported.sourceTitle || "來源文章"} blocks={imported.sourceBlocks} assets={imported.assets} fallbackHtml={imported.sourceContentHtml} />;
  const rewrittenPreview = draft && <WeChatArticlePreview title={draft.title} blocks={draft.blocks} assets={imported.assets} />;

  return <div className={styles.workspace}>
    <header className={styles.heading}><div><p className="eyebrow">文章生成 / 微信公眾號改寫</p><h1>{abandoned ? "工作已放棄" : expired ? "匯入已到期" : wizardSteps[step - 1]}</h1><p className="muted">一步一步確認內容，完成後再交給文章編輯器。</p></div><span className={styles.badge} role="status">{expired && !abandoned ? "暫存期限已到" : importStatusLabels[imported.status] || "工作狀態待確認"}</span></header>
    <nav aria-label="匯入步驟"><ol className={styles.steps}>{wizardSteps.map((label, index) => <li key={label} className={index + 1 < initialWizardStep(imported.status, imported.failureStage) ? styles.stepDone : undefined}><button type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={pending || !canView(index + 1)} onClick={() => { setStep(index + 1); setConfirm(null); }}><span className={styles.stepNumber}>{index + 1}</span> {label}</button></li>)}</ol></nav>
    {error && <p className={`${styles.warning} ${styles.danger}`} role="alert">{error}</p>}
    {!ready && !unavailable && <p className={remaining <= 600000 ? styles.warning : styles.notice}>本筆匯入剩餘 {Math.floor(remaining / 60000)} 分 {Math.floor(remaining / 1000) % 60} 秒；到期後不能再提交改寫或轉存。</p>}
    {unavailable ? <section className={styles.card}><h2>{abandoned ? "此工作已放棄" : busy ? "暫存期限已到" : "暫存已到期"}</h2><p>{busy ? "目前工作結束或租約失效後將清理暫存，不能再提交新的操作。" : "原文、未完成草稿與圖片暫存會依清理規則移除；已轉存的 R2 圖片不受影響。"}</p><Link className="button button-primary" href="/admin/posts/wechat">重新匯入</Link></section> : <>
      {busy && <section className={styles.card}><h2>{importStatusLabels[imported.status]}</h2><p>{imported.status.includes("QUEUED") ? "工作已排入佇列，請勿重複提交。" : "可以留在此頁等候，完成後會自動顯示下一步。"}</p><p className={styles.notice}>本階段已等待約 {Math.max(0, Math.floor((now - Date.parse(imported.updatedAt)) / 1000))} 秒 · 每 5 秒更新狀態</p>{workerOffline && <p className={styles.warning}>Worker 未連線或已停止，工作可能尚未開始。<Link href="/admin/worker">查看 Worker 監控</Link></p>}{imported.worker?.lastError && <p className={styles.warning}>{imported.worker.lastError}</p>}</section>}
      {failed && <section className={styles.card}><h2>{imported.status === "TRANSFER_FAILED" ? "圖片轉存需要處理" : "本步驟需要處理"}</h2><p role="alert" className={`${styles.warning} ${styles.danger}`}>{imported.errorSummary || "工作未完成，請確認狀態後重試。"}</p><p className={styles.notice}>{draft ? "上一版草稿仍保留，可切換至審閱結果查看。" : hasOriginal ? "來源內容仍在暫存期限內，可重試本階段。" : "尚未取得可預覽的文章。"}</p><button className="button button-primary" disabled={pending} onClick={() => imported.failureStage === "REWRITE" ? setConfirm("retry") : execute(() => queueWeChatRetryAction(imported.id))}>{imported.failureStage === "REWRITE" ? "重試改寫" : imported.status === "TRANSFER_FAILED" ? "重試未完成圖片" : "重試擷取"}</button></section>}
      <div className={styles.layout}>
        <div className={styles.main}>
          {step === 1 && <section className={styles.card}><h2>本筆匯入的來源</h2><label>文章連結<input readOnly value={imported.sourceUrl} /></label><p className={styles.notice}>此連結已建立匯入工作；若要更換文章，請另建新工作。查看來源不會重新抓取或延長期限。</p><Link href="/admin/posts/wechat">匯入另一篇文章</Link></section>}
          {step === 2 && <section className={styles.card}><div className={styles.stats}><span>來源文章</span><span>{imported.assets.length} 張圖片</span><span>{imported.sourceAccountName || imported.sourceAuthor || "作者未提供"}</span></div>{originalPreview}</section>}
          {step === 3 && <section className={styles.card}><h2>這篇文章要如何改寫？</h2><label>目標語言<select value={locale} disabled={!canRewrite || pending} onChange={(event) => setLocale(event.target.value)}>{Object.entries(languageNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><fieldset className={styles.mode} disabled={!canRewrite || pending}><legend>改寫方式</legend><label><input type="radio" name="rewrite-mode" checked={mode === "FAITHFUL"} onChange={() => setMode("FAITHFUL")} /> 忠實改寫<small>保留段落與圖片順序，轉譯為目標語言並改善表達。</small></label><label><input type="radio" name="rewrite-mode" checked={mode === "DEEP_SEO"} onChange={() => setMode("DEEP_SEO")} /> 深度 SEO 改寫<small>重組文字架構與搜尋重點，保留完整圖片引用，不虛構事實。</small></label></fieldset><label>補充要求（選填）<textarea value={instructions} maxLength={2000} rows={5} disabled={!canRewrite || pending} placeholder="例如：面向初學者、使用台灣用語、保留操作步驟。" onChange={(event) => setInstructions(event.target.value)} /></label><p className={styles.notice}>開始改寫會呼叫一次模型並記錄用量，不會自動重試或發佈。{draft && "重新生成成功前會保留上一版；尚未確認的手動欄位修改不會帶入新版本。"}</p></section>}
          {step === 4 && draft && <section className={styles.card}><div className={styles.tabs} aria-label="預覽方式">{([["rewrite", "改寫結果"], ["original", "原文"], ["compare", "左右對照"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} disabled={value !== "rewrite" && !hasOriginal} onClick={() => setTab(value)}>{label}</button>)}</div>{tab === "compare" ? <div className={styles.compare}><div><p className="eyebrow">原文</p>{originalPreview}</div><div><p className="eyebrow">改寫結果</p>{rewrittenPreview}</div></div> : tab === "original" ? originalPreview : rewrittenPreview}</section>}
          {step === 5 && <section className={styles.card}><h2>{ready ? "圖片已保存，準備最後編輯" : "將圖片保存至 R2"}</h2><p>{uploaded} / {imported.assets.length} 張圖片已完成轉存</p><progress className={styles.progress} aria-label="圖片轉存進度" value={ready && !imported.assets.length ? 1 : uploaded} max={imported.assets.length || 1} /><p className={styles.notice}>成功轉存的圖片不會重複上傳；資料庫中的圖片二進位會在轉存成功後釋放。</p>{ready && <><p className={styles.success}>草稿已備妥。接下來可在文章編輯器調整正文、分類與作者，再自行確認發佈。</p>{rewrittenPreview}</>}</section>}
        </div>
        <aside className={styles.sidebar} aria-label="本步驟檢查與設定">
          <section className={styles.card}><h3>{ready ? "儲存狀態" : "暫存期限"}</h3>{ready ? <p className={styles.success}>圖片已保存，原始抓取暫存依規則清除。</p> : <><p className={`${styles.timer} ${remaining <= 300000 ? styles.danger : ""}`}>暫存剩餘 {String(Math.floor(remaining / 60000)).padStart(2, "0")}:{String(Math.floor(remaining / 1000) % 60).padStart(2, "0")}</p><p className={styles.notice}>到期時間：{new Date(imported.expiresAt).toLocaleTimeString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })}（台北）<br />建立後 30 分鐘到期，切換步驟不會延長。</p>{remaining <= 600000 && <p className={styles.warning}>{remaining <= 300000 ? "即將到期，未完成內容將被清除。" : "剩餘不到 10 分鐘，請留意審閱與轉存時間。"}</p>}</>}</section>
          {step === 4 && draft ? <section className={styles.card}><h3>標題與 SEO</h3><label>文章標題<input value={draft.title} maxLength={180} disabled={ready || busy || pending} onChange={(event) => edit("title", event.target.value)} /></label><label>摘要<textarea value={draft.excerpt} maxLength={320} disabled={ready || busy || pending} onChange={(event) => edit("excerpt", event.target.value)} /></label><details><summary>搜尋結果設定</summary><label>SEO 標題<input value={draft.seoTitle} maxLength={70} onChange={(event) => edit("seoTitle", event.target.value)} disabled={ready || busy || pending} /></label><p className={styles.notice}>{draft.seoTitle.length} / 70 字</p><label>SEO 描述<textarea value={draft.seoDescription} maxLength={170} onChange={(event) => edit("seoDescription", event.target.value)} disabled={ready || busy || pending} /></label><p className={styles.notice}>{draft.seoDescription.length} / 170 字</p><label>網址代稱<input value={draft.slug} maxLength={160} onChange={(event) => edit("slug", event.target.value)} disabled={ready || busy || pending} /></label><label>關鍵字<input value={draft.seoKeywords} maxLength={500} onChange={(event) => edit("seoKeywords", event.target.value)} disabled={ready || busy || pending} /></label></details><p className={styles.notice}>欄位修改於「確認內容並轉存圖片」時儲存；正文於文章編輯器調整。</p></section> : null}
          {(step === 2 || step === 4) && <section className={styles.card}><h3>封面圖片</h3>{cover ? <WeChatPreviewImage key={cover.id} asset={cover} alt="文章封面預覽" /> : <p className={styles.notice}>目前未設定封面，可選擇已擷取的圖片。</p>}{step === 4 && <label>選擇封面<select value={coverId} disabled={ready || busy || pending} onChange={(event) => { setCoverId(event.target.value); setReviewed(false); }}><option value="">不設定封面</option>{imported.assets.filter((asset) => ["STAGED", "READY"].includes(asset.status)).map((asset, index) => <option key={asset.id} value={asset.id}>圖片 {index + 1}{asset.alt ? ` · ${asset.alt}` : ""}</option>)}</select></label>}</section>}
          {step === 4 && draft && <section className={styles.card}><h3>發佈前檢查</h3><ul className={styles.checks}><li>目標語言：{languageNames[imported.targetLocale]}</li><li>圖片引用：{images.length - missingImages} / {images.length} 張有效</li><li>{cover ? "已選擇封面" : "尚未選擇封面"}</li></ul>{simplifiedWarning && <p className={styles.warning}>偵測到可能的簡體用字，仍需繁體校正。此檢查僅供提醒，非完整語言驗證。</p>}{missingImages > 0 && <p className={styles.warning}>圖片引用不完整，暫停轉存；請返回重新改寫。</p>}<h3>待核實事項</h3>{draft.needsVerification.length ? <ul className={styles.checks}>{draft.needsVerification.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className={styles.notice}>模型未列出項目，不代表內容已經事實查核。</p>}{imported.status === "REWRITTEN" && <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />我已檢視完整內容、圖片與待核實事項。</label>}</section>}
          <details className={`${styles.card} ${styles.details}`}><summary>工作詳情與其他操作</summary><p>工作 ID：{imported.id}</p><p>最後更新：{new Date(imported.updatedAt).toLocaleTimeString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })}（台北）</p><p>來源：<a href={imported.sourceUrl} target="_blank" rel="noreferrer">開啟原始文章</a><br />僅管理端保留，不會公開寫入文章頁尾。</p><Link href="/admin/worker">查看 Worker 監控</Link>{!ready && <div><button className={styles.dangerButton} disabled={pending} onClick={() => setConfirm("abandon")}>放棄並清除暫存</button></div>}</details>
        </aside>
      </div>
      {confirm && <section ref={confirmationPanel} tabIndex={-1} className={styles.card} role="alertdialog" aria-modal="false" aria-labelledby="wechat-confirm-title"><h2 id="wechat-confirm-title">{confirm === "abandon" ? "確定放棄這筆匯入？" : confirm === "retry" ? "確認重新呼叫模型？" : "確認重新生成草稿？"}</h2><p>{confirm === "abandon" ? "這會清除原文、未完成草稿及資料庫圖片暫存，無法復原；之後需重新抓取。" : "這是新的模型呼叫，會產生用量。上次結果不明時仍可能已計費；系統不會自動重送。"}</p><div className={styles.actionGroup}><button className="button button-quiet" disabled={pending} onClick={() => setConfirm(null)}>取消</button><button className="button button-primary" disabled={pending} onClick={() => confirm === "abandon" ? execute(() => abandonWeChatImportAction(imported.id)) : confirm === "retry" ? execute(() => queueWeChatRetryAction(imported.id)) : rewrite()}>確認{confirm === "abandon" ? "放棄" : "改寫"}</button></div></section>}
      <footer className={styles.actions}><div className={styles.actionGroup}>{step > 2 && hasOriginal && <button className="button button-quiet" disabled={pending} onClick={() => setStep(step === 5 ? 4 : step - 1)}>上一步</button>}<span className={styles.notice}>步驟 {step} / 5 · 不會自動發佈</span></div><div className={styles.actionGroup}>{step === 2 && canRewrite && <button className="button button-primary" disabled={pending} onClick={() => setStep(3)}>確認原文，設定改寫</button>}{step === 3 && canRewrite && <button className="button button-primary" disabled={pending} onClick={() => draft ? setConfirm("rewrite") : rewrite()}>{pending ? "提交中…" : draft ? "重新生成草稿" : "開始改寫"}</button>}{step === 4 && imported.status === "REWRITTEN" && <button className="button button-primary" disabled={pending || !reviewed || !!missingImages || !draft?.title.trim() || !draft?.slug.trim()} onClick={transfer}>{pending ? "提交中…" : "確認內容並轉存圖片"}</button>}{ready && <Link className="button button-primary" href={`/admin/posts/new?wechatImportId=${encodeURIComponent(imported.id)}`}>進入文章編輯器</Link>}</div></footer>
    </>}
  </div>;
}
