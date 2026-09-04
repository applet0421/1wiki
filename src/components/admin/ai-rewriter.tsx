"use client";

import { useState } from "react";
import { rewriteArticleAction } from "@/app/(backoffice)/admin/posts/rewrite-actions";
import type { GeneratedArticle } from "@/lib/ai/types";
import { PostEditor } from "./post-editor";
import { RichTextEditor } from "./rich-text-editor";
import { defaultLocale, getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type CategoryOption = { id: string; name: string; locale: string };

export function AIRewriter({ categories, provider }: { categories: CategoryOption[]; provider: string }) {
  const [sourceTitle, setSourceTitle] = useState("");
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [sourceContentHtml, setSourceContentHtml] = useState("");
  const [rewritten, setRewritten] = useState<GeneratedArticle | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function rewrite() {
    setLoading(true);
    setError("");
    try {
      const result = await rewriteArticleAction({ locale, sourceTitle, sourceContentHtml });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRewritten(result.data);
    } catch {
      setError("AI 改寫失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return <div className="admin-grid">
    <section className="panel source-editor">
      <div className="rewrite-intro">
        <div><p className="eyebrow">AI 改寫 · {provider}</p><h2>貼上原文章</h2></div>
        <p className="muted">AI 會依本站內容策略、台灣用語與 SEO 結構重新撰寫；完成後仍可自由編輯。</p>
      </div>
      <div className="form-stack">
        <label>內容語系<select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
        <label>原文章標題<input aria-label="原文章標題" value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} maxLength={180} /></label>
        <div><span className="field-label">原文章內容</span><RichTextEditor inputName="" ariaLabel="原文章內容" onHtmlChange={setSourceContentHtml} /></div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" type="button" onClick={rewrite} disabled={loading}>{loading ? "AI 改寫中…" : "使用 AI 改寫"}</button>
    </section>

    {rewritten ? <section className="rewrite-result" aria-label="AI 改寫結果">
      <div className="result-heading"><p className="eyebrow">改寫結果</p><h2>確認並完成文章</h2><p className="muted">內容尚未儲存。請選擇分類並檢查全文後，再儲存草稿或發布。</p></div>
      <PostEditor key={`${rewritten.title}-${rewritten.seoDescription}`} locale={locale} categories={categories} initialGenerated={rewritten} provider={provider} showAIGenerator={false} />
    </section> : <div className="panel rewrite-empty"><strong>改寫結果會顯示在這裡</strong><p className="muted">貼上原文並執行 AI 改寫，不會自動儲存或發布。</p></div>}
  </div>;
}
