"use client";

import { useState } from "react";
import { slugifyTitle } from "@/lib/content/slug";

export function TitleSlugFields({ initialTitle = "", initialSlug = "" }: { initialTitle?: string; initialSlug?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug || slugifyTitle(initialTitle));
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(initialSlug));

  return <>
    <label className="span-2">標題<input name="title" aria-label="標題" value={title} onChange={(event) => { const value = event.target.value; setTitle(value); if (!slugWasEdited) setSlug(slugifyTitle(value)); }} required maxLength={180} /></label>
    <label>網址代稱<input name="slug" aria-label="網址代稱" value={slug} onChange={(event) => { setSlug(event.target.value); setSlugWasEdited(true); }} required maxLength={160} /></label>
  </>;
}
