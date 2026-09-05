"use client";

import type { AuthorOption } from "@/lib/content/authors";
import { useState } from "react";
import { savePostAction } from "@/app/(backoffice)/admin/posts/actions";
import type { GeneratedArticle } from "@/lib/ai/types";
import type { CategoryOption } from "@/lib/content/category-tree";
import { AIGenerator } from "./ai-generator";
import { CategorySelect } from "./category-select";
import { RichTextEditor } from "./rich-text-editor";
import { SeoFields } from "./seo-fields";
import { TitleSlugFields } from "./title-slug-fields";
import { defaultLocale, getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type EditablePost = { id: string; locale: string; status: "DRAFT" | "PUBLISHED"; title: string; slug: string; excerpt: string; contentHtml: string; coverImage: string | null; categoryId: string; bylineId?: string | null; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null; aiContentType?: "TROUBLESHOOTING" | "HOW_TO" | null; primaryKeyword?: string | null; searchIntent?: string | null; aiSourceSupport?: "STRONG" | "MEDIUM" | null; aiNeedsVerification?: unknown };

function verificationNotes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function firstActiveAuthorId(authors: AuthorOption[], locale: Locale): string {
  return authors.find((author) => author.locale === locale && !author.archivedAt)?.id ?? "";
}

export function PostEditor({ categories, authors = [], post, error, provider = "deepseek", initialGenerated, showAIGenerator = true, locale = defaultLocale }: { categories: CategoryOption[]; authors?: AuthorOption[]; post?: EditablePost; error?: string; provider?: string; initialGenerated?: GeneratedArticle; showAIGenerator?: boolean; locale?: Locale }) {
  const initialLocale = (post?.locale as Locale | undefined) ?? locale;
  const [selectedLocale, setSelectedLocale] = useState<Locale>(initialLocale);
  const [selectedAuthor, setSelectedAuthor] = useState(
    post ? post.bylineId ?? "" : firstActiveAuthorId(authors, initialLocale),
  );
  const [generated, setGenerated] = useState<GeneratedArticle | null>(initialGenerated || null);
  const source: EditablePost | undefined = generated ? {
    id: post?.id || "",
    locale: post?.locale || selectedLocale,
    status: post?.status || "DRAFT",
    title: generated.title,
    slug: generated.slug,
    excerpt: generated.excerpt,
    contentHtml: generated.contentHtml,
    coverImage: post?.coverImage || null,
    categoryId: post?.categoryId || "",
    seoTitle: generated.seoTitle,
    seoDescription: generated.seoDescription,
    seoKeywords: generated.seoKeywords,
    canonicalUrl: post?.canonicalUrl || null,
  } : post;
  const notes = verificationNotes(post?.aiNeedsVerification);
  const localeLocked = post?.status === "PUBLISHED";
  return <form action={savePostAction} className="admin-grid">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    {post?.aiContentType ? <section className="panel ai-review" role="region" aria-label="AI 審核資訊">
      <div><p className="eyebrow">AI 審核資訊</p><h2>{post.aiContentType === "TROUBLESHOOTING" ? "Troubleshooting" : "How-to"} · {post.aiSourceSupport === "STRONG" ? "Strong" : "Medium"}</h2></div>
      <dl><div><dt>主要關鍵字</dt><dd>{post.primaryKeyword}</dd></div><div><dt>搜尋意圖</dt><dd>{post.searchIntent}</dd></div></dl>
      {notes.length > 0 ? <div className="verification-warning"><strong>發布前需要查證</strong><ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul></div> : <p className="form-success">AI 未標記待查證項目，發布前仍請人工檢查全文。</p>}
    </section> : null}
    {showAIGenerator ? <AIGenerator provider={provider} locale={selectedLocale} onGenerated={setGenerated} /> : null}
    <fieldset key={generated?.title || "stored"} className="panel form-grid"><legend>文章內容</legend>
      <TitleSlugFields initialTitle={source?.title} initialSlug={source?.slug} />
      <label>內容語系<select name="locale" value={selectedLocale} disabled={localeLocked} onChange={(event) => { const nextLocale = event.target.value as Locale; setSelectedLocale(nextLocale); setSelectedAuthor(firstActiveAuthorId(authors, nextLocale)); }}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      {localeLocked ? <input type="hidden" name="locale" value={selectedLocale} /> : null}
      <label>分類<CategorySelect key={selectedLocale} name="categoryId" locale={selectedLocale} categories={categories} value={source?.locale === selectedLocale ? source.categoryId : ""} required /></label>
      <label>作者<select name="bylineId" value={selectedAuthor} onChange={(event) => setSelectedAuthor(event.target.value)} required>
        {post && !post.bylineId ? <option value="">原帳號署名（既有文章）</option> : null}
        {authors.filter((author) => author.locale === selectedLocale && (!author.archivedAt || author.id === post?.bylineId)).map((author) => <option key={author.id} value={author.id}>{author.name}{author.archivedAt ? "（已封存，保留署名）" : ""}</option>)}
        {!authors.some((author) => author.locale === selectedLocale && (!author.archivedAt || author.id === post?.bylineId)) ? <option value="" disabled>此語系尚無可用作者</option> : null}
      </select></label>
      <label className="span-2">摘要<textarea name="excerpt" defaultValue={source?.excerpt || ""} rows={3} maxLength={320} /></label>
      <label className="span-2">封面圖片網址<input name="coverImage" type="url" defaultValue={source?.coverImage || ""} /></label>
      <div className="span-2"><span className="field-label">正文</span><RichTextEditor initialHtml={source?.contentHtml} aiImageContext={{ postId: post?.id, locale: selectedLocale }} /></div>
    </fieldset>
    <SeoFields key={`seo-${generated?.title || "stored"}`} post={source} />
    <div className="editor-actions"><button type="submit" name="intent" value="draft" className="button button-quiet">儲存草稿</button><button type="submit" name="intent" value="publish" className="button button-primary">發布文章</button></div>
  </form>;
}
