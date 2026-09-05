"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { captureImageParagraphs, insertGeneratedImage, isImageTarget, type ImageParagraph, type ParagraphAnchor } from "./image-paragraphs";

export type ImageJobView = {
  id: string; status: "PLANNED" | "QUEUED" | "GENERATING" | "GENERATED" | "UPLOADING" | "READY" | "FAILED" | "UNKNOWN";
  prompt: string; alt: string; reason: string; targetId: string; paragraphs: ImageParagraph[];
  publicUrl: string | null; width: number | null; height: number | null; error: string | null;
  model: string; imageSize: string; aspectRatio: string; altWarning: string | null; canRetryUpload?: boolean;
};
const working = (job: ImageJobView | null) => !!job && ["QUEUED", "GENERATING", "GENERATED", "UPLOADING"].includes(job.status);
const statusLabels: Record<ImageJobView["status"], string> = { PLANNED: "配圖方案已完成", QUEUED: "等待生成", GENERATING: "正在生成圖片", GENERATED: "圖片已生成，待上傳", UPLOADING: "正在上傳圖片", READY: "圖片已準備好", FAILED: "處理失敗", UNKNOWN: "生成結果未知，不會自動重新生圖。重新建立配圖可能產生額外費用。" };

export function AIImagePanel({ editorRef, context, onInsert, open }: {
  editorRef: RefObject<HTMLDivElement | null>; context: { postId?: string; locale: string }; onInsert: (html: string) => void; open: boolean;
}) {
  const [job, setJob] = useState<ImageJobView | null>(null);
  const [prompt, setPrompt] = useState("");
  const [alt, setAlt] = useState("");
  const [targetId, setTargetId] = useState("");
  const [paragraphs, setParagraphs] = useState<ImageParagraph[]>([]);
  const anchors = useRef<ParagraphAnchor[]>([]);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [inserted, setInserted] = useState(false);
  const autoInsert = useRef(false);
  const storageKey = `ai-image:${context.postId || "new"}`;
  const recoveryController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function remember(view: ImageJobView) {
    setJob(view);
    try { sessionStorage.setItem(storageKey, view.id); } catch { /* Storage may be unavailable. */ }
  }
  useEffect(() => {
    const controller = new AbortController();
    recoveryController.current = controller;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(storageKey); } catch { return; }
    if (!saved) return;
    fetch(`/api/admin/ai-images/${encodeURIComponent(saved)}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const view = await response.json() as ImageJobView;
      if (controller.signal.aborted) return;
      setJob(view); setPrompt(view.prompt); setAlt(view.alt);
      setMessage("已恢復配圖任務；插入前請重新選擇目前正文中的段落。");
      const current = editorRef.current ? captureImageParagraphs(editorRef.current) : [];
      if (view.status === "PLANNED") {
        const matches = current.length === view.paragraphs.length && current.every((item, index) => item.text === view.paragraphs[index].text && item.tag === view.paragraphs[index].tag);
        const restored = matches ? current.map((item, index) => ({ ...item, id: view.paragraphs[index].id })) : [];
        anchors.current = restored; setParagraphs(restored); setTargetId("");
        if (!matches) setMessage("正文與原配圖方案不同，請重新分析正文後再生成圖片。");
      } else { anchors.current = current; setParagraphs(current); }

    }).catch(() => {});
    return () => controller.abort();
  }, [storageKey, editorRef]);
  useEffect(() => {
    if (!working(job)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/ai-images/${encodeURIComponent(job!.id)}`, { signal: controller.signal });
        const view = await response.json();
        if (!response.ok) throw new Error(view.error || "無法查詢生成進度");
        if (!controller.signal.aborted) {
          setJob(view); if (view.status === "READY") setAlt(view.alt);
          if (view.status === "READY" && autoInsert.current) insert(view);
        }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "無法查詢進度，請手動更新"); }
    }, 2000);
    return () => { clearTimeout(timer); controller.abort(); };
  // `insert` intentionally uses the current editor refs and is invoked only when a poll reaches READY.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);
  async function request(path: string, body?: object): Promise<ImageJobView | null> {
    if (locked.current) return null;
    locked.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
      const view = await response.json() as ImageJobView & { error: string };
      if (!response.ok) throw new Error(view.error || "AI 配圖失敗");
      if (!mounted.current) return null;
      remember(view); setPrompt(view.prompt); setAlt(view.alt);
      if (body && "paragraphs" in body) { setTargetId(view.targetId); setInserted(false); }
      return view;
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "AI 配圖失敗"); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
    return null;
  }
  function plan() {
    if (locked.current || working(job)) return;
    const editor = editorRef.current;
    if (!editor) return;
    const form = editor.closest("form");
    const title = (form?.elements.namedItem("title") as HTMLInputElement | null)?.value || "";
    const current = captureImageParagraphs(editor);
    onInsert(editor.innerHTML);
    if (!title.trim() || !current.some(isImageTarget)) { setError("請先填寫標題與至少一個正文段落。"); return; }
    recoveryController.current?.abort();
    anchors.current = current; setParagraphs(current); setTargetId("");
    void request("/api/admin/ai-images/plan", { title, locale: context.locale, postId: context.postId, paragraphs: current.map(({ id, text, tag }) => ({ id, text, tag })) });
  }
  async function autoPlanAndInsert() {
    if (locked.current || working(job)) return;
    const editor = editorRef.current;
    if (!editor) return;
    const form = editor.closest("form");
    const title = (form?.elements.namedItem("title") as HTMLInputElement | null)?.value || "";
    const current = captureImageParagraphs(editor);
    if (!title.trim() || !current.some(isImageTarget)) { setError("請先填寫標題與至少一個正文段落。"); return; }
    recoveryController.current?.abort();
    anchors.current = current; setParagraphs(current); setError(""); setMessage(""); setInserted(false);
    onInsert(editor.innerHTML);
    autoInsert.current = true;
    const plannedView = await request("/api/admin/ai-images/plan", { title, locale: context.locale, postId: context.postId, paragraphs: current.map(({ id, text, tag }) => ({ id, text, tag })) });
    if (!plannedView || !mounted.current) return;
    const target = plannedView.paragraphs.find(isImageTarget);
    if (!target || !plannedView.prompt.trim() || !plannedView.alt.trim()) { autoInsert.current = false; setError("AI 配圖方案缺少可用的段落或圖片描述。"); return; }
    setTargetId(target.id);
    const generatedView = await request(`/api/admin/ai-images/${plannedView.id}`, { action: "generate", prompt: plannedView.prompt, alt: plannedView.alt, targetId: target.id });
    if (generatedView?.status === "READY" && generatedView.publicUrl) insert(generatedView);
  }
  function refreshParagraphs() {
    const current = editorRef.current ? captureImageParagraphs(editorRef.current) : [];
    anchors.current = current; setParagraphs(current); setTargetId(""); setError("");
    setMessage("段落清單已更新，請重新選擇插入位置。");
  }
  function insert(sourceJob: ImageJobView | null = job) {
    if (!sourceJob?.publicUrl || inserted) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (!insertGeneratedImage(editor, anchors.current.find((item) => item.id === targetId), { ...sourceJob, publicUrl: sourceJob.publicUrl, alt: alt || sourceJob.alt })) {
      const current = captureImageParagraphs(editor); anchors.current = current; setParagraphs(current); setTargetId("");
      setError("原段落已變更或刪除，請重新選擇插入位置。圖片已保留。"); return;
    }
    onInsert(editor.innerHTML); setInserted(true); autoInsert.current = false; setError(""); setMessage("圖片已插入正文，請儲存文章。");
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
  }
  return <section className="ai-image-panel" aria-label="AI 配圖設定" hidden={!open}>
    <div className="ai-image-actions"><strong>AI 配圖</strong><button type="button" disabled={busy || working(job)} onClick={plan}>{job ? "重新分析正文" : "分析標題與正文"}</button><button type="button" disabled={busy || working(job)} onClick={() => void autoPlanAndInsert()}>自動執行並插入</button></div>
    <p>分析目前尚未儲存的內容，先確認配圖方案，再生成圖片。</p>
    {job ? <>
      <p role="status">{statusLabels[job.status]} · {job.imageSize} · {job.aspectRatio}</p>
      {job.reason ? <p>{job.reason}</p> : null}
      <label>插入位置<select value={targetId} disabled={busy || working(job) || inserted} onChange={(event) => { setTargetId(event.target.value); setError(""); }}><option value="">請選擇段落</option>{paragraphs.filter(isImageTarget).map((item) => <option key={item.id} value={item.id}>{item.text.slice(0, 100)}</option>)}</select></label>
      {job.status === "READY" && !inserted ? <button type="button" disabled={busy} onClick={refreshParagraphs}>更新可選段落</button> : null}
      <label>生圖 Prompt<textarea rows={5} maxLength={6000} value={prompt} disabled={busy || working(job) || job.status !== "PLANNED"} onChange={(event) => setPrompt(event.target.value)} /></label>
      <label>圖片替代文字（alt）<textarea rows={2} maxLength={500} value={alt} disabled={busy || working(job) || inserted} onChange={(event) => setAlt(event.target.value)} /></label>
      {job.altWarning ? <p>{job.altWarning}</p> : null}
      {job.status === "PLANNED" ? <button type="button" disabled={busy || !prompt.trim() || !alt.trim() || prompt.length > 6000 || alt.length > 500 || !targetId} onClick={() => void request(`/api/admin/ai-images/${job.id}`, { action: "generate", prompt, alt, targetId })}>生成圖片</button> : null}
      {job.publicUrl ? <div className="ai-image-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={job.publicUrl} alt={alt} width={job.width || undefined} height={job.height || undefined} /><button type="button" disabled={busy || inserted || !targetId || job.status !== "READY"} onClick={() => insert()}>{inserted ? "已插入正文" : "插入正文"}</button></div> : null}
      {job.status === "FAILED" && job.canRetryUpload ? <button type="button" disabled={busy} onClick={() => void request(`/api/admin/ai-images/${job.id}`, { action: "retry-upload" })}>重試上傳已生成圖片</button> : null}
      {job.status !== "PLANNED" ? <button type="button" disabled={busy} onClick={() => void request(`/api/admin/ai-images/${job.id}`)}>更新任務狀態</button> : null}
      {job.error ? <p role="alert">{job.error}</p> : null}
    </> : null}
    {busy ? <p role="status">處理中…</p> : null}{error ? <p role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}
  </section>;
}
