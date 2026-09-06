"use client";

import Link from "next/link";
import { useState } from "react";
import { RichTextEditor } from "./rich-text-editor";
import { CategorySelect } from "./category-select";
import type { CategoryOption } from "@/lib/content/category-tree";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";
import { saveSitePageAction } from "@/app/(backoffice)/admin/pages/actions";

type EditableSitePage = {
  id: string;
  locale: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  categoryId: string | null;
};

export function SitePageEditor({ page, locale, categories, error }: { page?: EditableSitePage; locale: Locale; categories: CategoryOption[]; error?: string }) {
  const [selectedLocale, setSelectedLocale] = useState<Locale>((page?.locale as Locale | undefined) || locale);
  const [selectedCategory, setSelectedCategory] = useState(page?.categoryId || "");
  return <form action={saveSitePageAction} className="admin-grid">
    {page ? <input type="hidden" name="id" value={page.id} /> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <fieldset className="panel form-grid"><legend>頁面內容</legend>
      <label>頁面標題<input name="title" defaultValue={page?.title || ""} required maxLength={180} /></label>
      <label>網址代稱<input name="slug" defaultValue={page?.slug || ""} required maxLength={160} pattern="[A-Za-z0-9\u00C0-\uFFFF]+(?:-[A-Za-z0-9\u00C0-\uFFFF]+)*" /></label>
      <label>內容語系<select name="locale" value={selectedLocale} onChange={(event) => { setSelectedLocale(event.target.value as Locale); setSelectedCategory(""); }}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      <label>分類（可不掛載）<CategorySelect name="categoryId" locale={selectedLocale} categories={categories} value={selectedCategory} includeAll emptyLabel="不掛載分類" onChange={setSelectedCategory} /></label>
      <label className="span-2">摘要<textarea name="excerpt" defaultValue={page?.excerpt || ""} rows={3} maxLength={320} /></label>
      <div className="span-2"><span className="field-label">頁面內容</span><RichTextEditor initialHtml={page?.contentHtml || ""} ariaLabel="網站頁面內容" aiImageContext={undefined} /></div>
    </fieldset>
    <fieldset className="panel form-grid"><legend>搜尋引擎設定</legend>
      <label>SEO 標題<input name="seoTitle" defaultValue={page?.seoTitle || ""} maxLength={70} /></label>
      <label>Canonical URL<input name="canonicalUrl" type="url" defaultValue={page?.canonicalUrl || ""} /></label>
      <label className="span-2">SEO 描述<textarea name="seoDescription" defaultValue={page?.seoDescription || ""} rows={3} maxLength={170} /></label>
      <label className="span-2">SEO 關鍵字<input name="seoKeywords" defaultValue={page?.seoKeywords || ""} maxLength={500} /></label>
    </fieldset>
    <div className="editor-actions"><Link href="/admin/pages" className="button button-quiet">取消</Link><button type="submit" name="intent" value="draft" className="button button-quiet">儲存草稿</button><button type="submit" name="intent" value="publish" className="button button-primary">發布頁面</button></div>
  </form>;
}
