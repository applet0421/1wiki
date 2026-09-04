"use client";

import { useState } from "react";
import type { GeneratedArticle } from "@/lib/ai/types";
import { generateArticleAction } from "@/app/admin/posts/generate-actions";
import type { Locale } from "@/lib/i18n/config";

export function AIGenerator({ provider, locale, onGenerated }: { provider: string; locale: Locale; onGenerated: (article: GeneratedArticle) => void }) {
  const [topic, setTopic] = useState(""); const [keyword, setKeyword] = useState(""); const [instructions, setInstructions] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function generate() { setLoading(true); setError(""); const result = await generateArticleAction({ locale, topic, keyword, instructions }); setLoading(false); if (!result.ok) { setError(result.error); return; } onGenerated(result.data); }
  return <section className="panel ai-panel"><div><p className="eyebrow">AI 草稿 · {provider}</p><h2>產生文章初稿</h2><p className="muted">成功後會填入編輯器，不會自動儲存或發布。</p></div><div className="form-grid"><label>文章主題<input value={topic} onChange={(event) => setTopic(event.target.value)} /></label><label>主要關鍵字<input value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label><label className="span-2">補充要求<textarea rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button-primary" type="button" onClick={generate} disabled={loading}>{loading ? "生成中…" : "使用 AI 產生草稿"}</button></section>;
}
