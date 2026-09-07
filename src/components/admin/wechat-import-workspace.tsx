"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abandonWeChatImportAction, queueWeChatRetryAction, queueWeChatRewriteAction, queueWeChatTransferAction } from "@/app/(backoffice)/admin/posts/wechat-actions";

type ImportView = { id: string; status: string; sourceUrl: string; sourceTitle: string | null; sourceAccountName: string | null; sourceAuthor: string | null; sourcePublishedAt: string | null; sourceContentHtml: string | null; targetLocale: string; rewriteMode: "FAITHFUL" | "DEEP_SEO"; errorSummary: string | null; expiresAt: string; assets: Array<{ id: string; status: string; publicUrl: string | null; alt: string }>; rewrittenDraft: { title?: unknown; excerpt?: unknown; needsVerification?: unknown } | null };

const activeStatuses = new Set(["FETCH_QUEUED", "FETCHING", "REWRITE_QUEUED", "REWRITING", "TRANSFER_QUEUED", "TRANSFERRING"]);

export function WeChatImportWorkspace({ imported }: { imported: ImportView }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!activeStatuses.has(imported.status)) return; const timer = window.setInterval(() => router.refresh(), 5000); return () => window.clearInterval(timer); }, [imported.status, router]);
  function queueRewrite(mode: "FAITHFUL" | "DEEP_SEO") { setError(""); startTransition(async () => { const result = await queueWeChatRewriteAction(imported.id, mode); if (!result.ok) setError(result.error); else router.refresh(); }); }
  function queueTransfer() { setError(""); startTransition(async () => { const result = await queueWeChatTransferAction(imported.id); if (!result.ok) setError(result.error); else router.refresh(); }); }
  function retry() { setError(""); startTransition(async () => { const result = await queueWeChatRetryAction(imported.id); if (!result.ok) setError(result.error); else router.refresh(); }); }
  function abandon() { setError(""); startTransition(async () => { const result = await abandonWeChatImportAction(imported.id); if (!result.ok) setError(result.error); else router.refresh(); }); }
  const draft = imported.rewrittenDraft;
  return <div className="admin-grid">
    <section className="panel"><p className="eyebrow">匯入工作</p><h2>{imported.sourceTitle || "正在擷取文章…"}</h2><p className="muted">狀態：{imported.status} · 目標語言：{imported.targetLocale}</p>{imported.sourceAccountName || imported.sourceAuthor ? <p className="muted">{[imported.sourceAccountName, imported.sourceAuthor].filter(Boolean).join(" · ")}</p> : null}<p className="muted">管理端來源紀錄：<a href={imported.sourceUrl} target="_blank" rel="noreferrer">開啟原始文章</a>（不會公開寫入文章內容）</p>{imported.errorSummary ? <p className="form-error" role="alert">{imported.errorSummary}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>
    {imported.status === "FETCHED" ? <section className="panel"><h2>來源預覽</h2>{imported.sourceContentHtml ? <div className="article-content" dangerouslySetInnerHTML={{ __html: imported.sourceContentHtml }} /> : <p className="muted">沒有可預覽的正文。</p>}<div className="editor-actions"><button className="button button-quiet" disabled={pending} onClick={() => queueRewrite("FAITHFUL")}>忠實改寫</button><button className="button button-primary" disabled={pending} onClick={() => queueRewrite("DEEP_SEO")}>深度 SEO 改寫</button></div></section> : null}
    {imported.status === "REWRITTEN" ? <section className="panel"><h2>{typeof draft?.title === "string" ? draft.title : "改寫草稿已完成"}</h2>{typeof draft?.excerpt === "string" ? <p className="muted">{draft.excerpt}</p> : null}<button className="button button-primary" disabled={pending} onClick={queueTransfer}>確認並轉存圖片到 R2</button></section> : null}
    {["FAILED", "UNKNOWN", "TRANSFER_FAILED"].includes(imported.status) ? <section className="panel"><h2>工作需要處理</h2><p className="muted">重試只會重新執行失敗的階段；若先前改寫中斷且結果不明，這是一次明確的新改寫請求。</p><div className="editor-actions"><button className="button button-primary" disabled={pending} onClick={retry}>重試失敗階段</button><button className="button button-quiet" disabled={pending} onClick={abandon}>放棄並清除暫存</button></div></section> : null}
    {!["READY", "ABANDONED", "EXPIRED"].includes(imported.status) && !["FAILED", "UNKNOWN", "TRANSFER_FAILED"].includes(imported.status) ? <div className="editor-actions"><button className="button button-quiet" disabled={pending} onClick={abandon}>放棄並清除暫存</button></div> : null}
    {imported.status === "ABANDONED" ? <section className="panel"><p className="form-success">此工作已放棄，來源正文與資料庫暫存圖片已清除。</p></section> : null}
    {imported.status === "READY" ? <section className="panel"><h2>草稿已備妥</h2><p className="form-success">圖片已轉存至 R2，資料庫暫存影像已清除。</p><Link className="button button-primary" href={`/admin/posts/new?wechatImportId=${encodeURIComponent(imported.id)}`}>開啟文章編輯器</Link></section> : null}
  </div>;
}
