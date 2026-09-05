"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveAuthorAction } from "@/app/(backoffice)/admin/authors/actions";
import { RichTextEditor } from "./rich-text-editor";
import { slugifyTitle } from "@/lib/content/slug";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type EditableAuthor = { id: string; name: string; slug: string; contentHtml: string; archivedAt: Date | null };

export function AuthorForm({ locale, author }: { locale: Locale; author?: EditableAuthor }) {
  const [state, action, pending] = useActionState(saveAuthorAction, {});
  const [name, setName] = useState(author?.name ?? "");
  const [slug, setSlug] = useState(author?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(author));
  return <form action={action} className="admin-grid">
    {author ? <input type="hidden" name="id" value={author.id} /> : null}
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {author?.archivedAt ? <p className="muted">此作者已封存，仍可修改介紹與既有文章署名。</p> : null}
    <fieldset className="panel form-grid" disabled={pending}>
      <legend>作者資料</legend>
      <label>內容語系<select name="locale" defaultValue={locale} disabled={Boolean(author)}>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      {author ? <input type="hidden" name="locale" value={locale} /> : null}
      <label>作者名稱<input name="name" required maxLength={100} value={name} onChange={(event) => { setName(event.target.value); if (!slugEdited) setSlug(slugifyTitle(event.target.value)); }} /></label>
      <label className="span-2">網址代稱<input name="slug" required maxLength={160} value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true); }} /><span className="muted">作者頁網址的一部分；修改後，舊網址將不再有效。</span></label>
      <div className="span-2"><span className="field-label">作者介紹</span><RichTextEditor initialHtml={author?.contentHtml} ariaLabel="作者介紹" /></div>
    </fieldset>
    <div className="editor-actions"><Link href={`/admin/authors?locale=${locale}`} className="button button-quiet">返回作者庫</Link><button type="submit" disabled={pending} className="button button-primary">{pending ? "儲存中…" : "儲存作者"}</button></div>
  </form>;
}
