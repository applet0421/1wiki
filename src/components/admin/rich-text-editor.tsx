"use client";

import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";

import { AIImagePanel } from "./ai-image-panel";

type RichTextEditorProps = {
  aiImageContext?: { postId?: string; locale: string };
  initialHtml?: string;
  inputName?: string;
  ariaLabel?: string;
  onHtmlChange?: (html: string) => void;
};

export function RichTextEditor({ initialHtml = "", inputName = "contentHtml", ariaLabel = "文章正文", onHtmlChange, aiImageContext }: RichTextEditorProps) {
  const [aiImageOpen, setAIImageOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const initialMarkup = useMemo(() => ({ __html: initialHtml }), [initialHtml]);
  const [html, setHtml] = useState(initialHtml);
  const [uploadStatus, setUploadStatus] = useState("");
  const [insertMode, setInsertMode] = useState<"link" | "image" | null>(null);
  const [insertUrl, setInsertUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [pendingUpload, setPendingUpload] = useState<{ publicUrl: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  function updateHtml(nextHtml: string) { setHtml(nextHtml); onHtmlChange?.(nextHtml); }
  function restoreSelection() {
    const range = selectionRef.current;
    const editor = editorRef.current;
    if (!range || !editor || !editor.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  function command(name: string, value?: string) { editorRef.current?.focus(); restoreSelection(); document.execCommand(name, false, value); selectionRef.current = null; updateHtml(editorRef.current?.innerHTML || ""); }
  function openInsert(mode: "link" | "image") {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    selectionRef.current = range && editorRef.current?.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
    setInsertUrl("");
    setImageAlt("");
    setInsertMode(mode);
  }
  function applyInsert() {
    if (!insertUrl.match(/^https?:\/\//)) return;
    if (insertMode === "link") command("createLink", insertUrl);
    if (insertMode === "image") insertImage(insertUrl, imageAlt);
    setInsertMode(null);
  }
  function insertImage(url: string, alt = "") {
    const editor = editorRef.current;
    if (!editor) return;
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    restoreSelection();
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(image);
      range.setStartAfter(image);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else editor.append(image);
    updateHtml(editor.innerHTML);
  }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadStatus("正在上傳圖片…");
    try {
      const signature = await fetch("/api/admin/uploads/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      const payload = await signature.json() as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (!signature.ok || !payload.uploadUrl || !payload.publicUrl) throw new Error(payload.error || "無法建立圖片上傳網址");
      const upload = await fetch(payload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upload.ok) throw new Error("圖片上傳失敗，請再試一次");
      const defaultAlt = file.name.replace(/\.[^.]+$/, "");
      setImageAlt(defaultAlt);
      setInsertMode(null);
      setPendingUpload({ publicUrl: payload.publicUrl });
      setUploadStatus("圖片已上傳，請設定替代文字後插入正文");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "圖片上傳失敗，請再試一次");
    }
  }
  function selectImage(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    setSelectedImage(target);
    setImageAlt(target.alt);
    setInsertMode(null);
    setPendingUpload(null);
  }
  function updateSelectedImage() {
    if (!selectedImage) return;
    selectedImage.alt = imageAlt.trim();
    updateHtml(editorRef.current?.innerHTML || "");
    setSelectedImage(null);
    setUploadStatus("圖片替代文字已更新");
  }
  return <div className="editor-frame">
    <div className="editor-toolbar" role="toolbar" aria-label="文章格式">
      <button type="button" onClick={() => command("formatBlock", "p")}>段落</button><button type="button" onClick={() => command("formatBlock", "h2")}>H2</button><button type="button" onClick={() => command("formatBlock", "h3")}>H3</button><button type="button" onClick={() => command("bold")}><strong>粗體</strong></button><button type="button" onClick={() => command("italic")}><em>斜體</em></button><button type="button" onClick={() => command("underline")}><u>底線</u></button><button type="button" onClick={() => openInsert("link")}>連結</button><button type="button" onClick={() => openInsert("image")}>圖片網址</button><button type="button" onClick={() => fileInputRef.current?.click()}>上傳圖片</button>{aiImageContext ? <button type="button" aria-expanded={aiImageOpen} onClick={() => setAIImageOpen(!aiImageOpen)}>AI 配圖</button> : null}<button type="button" onClick={() => command("insertUnorderedList")}>項目</button><button type="button" onClick={() => command("insertOrderedList")}>編號</button>
    </div>
    {aiImageContext ? <AIImagePanel editorRef={editorRef} context={aiImageContext} onInsert={updateHtml} open={aiImageOpen} /> : null}
    {insertMode ? <div className="editor-insert-form" role="group" aria-label={insertMode === "link" ? "插入連結" : "插入圖片"}>
      <label>{insertMode === "link" ? "連結網址" : "圖片網址"}<input autoFocus type="url" placeholder="https://" value={insertUrl} onChange={(event) => setInsertUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyInsert(); }} /></label>
      {insertMode === "image" ? <label>圖片替代文字<input maxLength={500} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} /></label> : null}
      <button type="button" onClick={applyInsert}>{insertMode === "link" ? "插入連結" : "插入圖片"}</button><button type="button" onClick={() => setInsertMode(null)}>取消</button>
    </div> : null}
    {pendingUpload ? <div className="editor-insert-form" role="group" aria-label="設定上傳圖片">
      <label>圖片替代文字<input autoFocus maxLength={500} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} /></label>
      <button type="button" disabled={!imageAlt.trim()} onClick={() => { insertImage(pendingUpload.publicUrl, imageAlt.trim()); setPendingUpload(null); setUploadStatus("圖片已插入正文"); }}>{"插入圖片"}</button>
      <button type="button" onClick={() => { setPendingUpload(null); setUploadStatus("圖片已上傳，尚未插入正文"); }}>取消</button>
    </div> : null}
    {selectedImage ? <div className="editor-insert-form" role="group" aria-label="編輯圖片">
      <label>圖片替代文字<input autoFocus maxLength={500} value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} /></label>
      <button type="button" disabled={!imageAlt.trim()} onClick={updateSelectedImage}>更新圖片</button>
      <button type="button" onClick={() => setSelectedImage(null)}>取消</button>
    </div> : null}
    <div ref={editorRef} className="rich-editor article-prose" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={initialMarkup} onInput={(event) => updateHtml(event.currentTarget.innerHTML)} onClick={selectImage} aria-label={ariaLabel} />
    <input ref={fileInputRef} className="sr-only" aria-label="選擇要上傳的圖片" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} />
    {uploadStatus ? <p className="editor-upload-status" role="status">{uploadStatus}</p> : null}
    {inputName ? <input type="hidden" name={inputName} value={html} /> : null}
  </div>;
}
