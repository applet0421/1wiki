"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { analyzeContentAction, generateContentDraftAction } from "@/app/(backoffice)/admin/posts/generate/actions";
import type { ContentIdea } from "@/lib/ai/types";
import { defaultLocale, getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

const typeLabels = { TROUBLESHOOTING: "Troubleshooting", HOW_TO: "How-to" } as const;
const supportLabels = { STRONG: "Strong", MEDIUM: "Medium" } as const;

export function AIContentGenerator({ provider }: { provider: string }) {
  const router = useRouter();
  const [sourceContent, setSourceContent] = useState("");
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [ideas, setIdeas] = useState<ContentIdea[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function analyze() {
    if (!sourceContent.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const result = await analyzeContentAction({ locale, sourceContent });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIdeas(result.data.ideas);
      setSelectedIndex(null);
    } catch {
      setError("AI 分析失敗，請稍後再試。");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generate() {
    if (selectedIndex === null || !ideas?.[selectedIndex]) return;
    setGenerating(true);
    setError("");
    try {
      const result = await generateContentDraftAction({ locale, sourceContent, idea: ideas[selectedIndex] });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/posts/${result.data.postId}?success=generated`);
    } catch {
      setError("AI 生成失敗，請稍後再試。");
    } finally {
      setGenerating(false);
    }
  }

  return <div className="generator-flow">
    <section className="panel generator-step">
      <div className="step-heading"><span>1</span><div><p className="eyebrow">參考來源 · {provider}</p><h2>輸入參考內容</h2></div></div>
      <p className="muted">貼上文章、官方說明、產品資料、自己的筆記或實測內容。來源只作為事實素材，不會自動發布。</p>
      <label className="form-stack">內容語系<select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      <label className="form-stack">參考內容<textarea aria-label="參考內容" rows={14} maxLength={50_000} value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} placeholder="在這裡貼上參考內容……" /></label>
      <div className="generator-actions"><small className="muted">{sourceContent.length.toLocaleString()} / 50,000</small><button type="button" className="button button-primary" disabled={!sourceContent.trim() || analyzing || generating} onClick={analyze}>{analyzing ? "分析中…" : "分析內容"}</button></div>
    </section>

    <section className="panel generator-step" aria-labelledby="ideas-heading">
      <div className="step-heading"><span>2</span><div><p className="eyebrow">內容機會</p><h2 id="ideas-heading">選擇文章主題</h2></div></div>
      {ideas === null ? <p className="muted generator-placeholder">分析完成後，這裡會顯示適合建立的 Troubleshooting／How-to 主題。</p> : ideas.length === 0 ? <p className="muted generator-placeholder">目前沒有發現適合建立獨立文章的主題。</p> : <div className="idea-list">{ideas.map((idea, index) => <label className={`idea-card${selectedIndex === index ? " idea-card-selected" : ""}`} key={`${idea.type}-${idea.searchIntent}`}>
        <input type="radio" name="contentIdea" checked={selectedIndex === index} onChange={() => setSelectedIndex(index)} aria-label={`${idea.title}，${typeLabels[idea.type]}，${supportLabels[idea.support]}`} />
        <span className="idea-copy"><span className="idea-meta"><span>{typeLabels[idea.type]}</span><span className={`support support-${idea.support.toLowerCase()}`}>{supportLabels[idea.support]}</span></span><strong>{idea.title}</strong><span><b>搜尋意圖：</b>{idea.searchIntent}</span><small>主要關鍵字：{idea.primaryKeyword}</small></span>
      </label>)}</div>}
    </section>

    <section className="panel generator-step">
      <div className="step-heading"><span>3</span><div><p className="eyebrow">文章草稿</p><h2>生成並進入編輯器</h2></div></div>
      {selectedIndex === null || !ideas?.[selectedIndex] ? <p className="muted generator-placeholder">先選擇一個文章主題。</p> : <div className="selected-idea"><strong>{ideas[selectedIndex].title}</strong><p className="muted">AI 會依照「{ideas[selectedIndex].searchIntent}」重新撰寫，並從現有分類中自動選擇最合適的一項。</p></div>}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="generator-actions"><span /><button type="button" className="button button-primary" disabled={selectedIndex === null || generating || analyzing} onClick={generate}>{generating ? "生成草稿中…" : "生成文章"}</button></div>
    </section>
  </div>;
}
