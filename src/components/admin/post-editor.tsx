"use client";

import { useState } from "react";
import { savePostAction } from "@/app/admin/posts/actions";
import type { GeneratedArticle } from "@/lib/ai/types";
import { AIGenerator } from "./ai-generator";
import { RichTextEditor } from "./rich-text-editor";
import { SeoFields } from "./seo-fields";
import { TitleSlugFields } from "./title-slug-fields";

type CategoryOption = { id: string; name: string };
type EditablePost = { id: string; title: string; slug: string; excerpt: string; contentHtml: string; coverImage: string | null; categoryId: string; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null };

export function PostEditor({ categories, post, error, provider = "deepseek", initialGenerated, showAIGenerator = true }: { categories: CategoryOption[]; post?: EditablePost; error?: string; provider?: string; initialGenerated?: GeneratedArticle; showAIGenerator?: boolean }) {
  const [generated, setGenerated] = useState<GeneratedArticle | null>(initialGenerated || null);
  const source: EditablePost | undefined = generated ? {
    id: post?.id || "",
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
  return <form action={savePostAction} className="admin-grid">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    {showAIGenerator ? <AIGenerator provider={provider} onGenerated={setGenerated} /> : null}
    <fieldset key={generated?.title || "stored"} className="panel form-grid"><legend>文章內容</legend>
      <TitleSlugFields initialTitle={source?.title} initialSlug={source?.slug} />
      <label>分類<select name="categoryId" defaultValue={source?.categoryId || ""} required><option value="" disabled>選擇分類</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="span-2">摘要<textarea name="excerpt" defaultValue={source?.excerpt || ""} rows={3} maxLength={320} /></label>
      <label className="span-2">封面圖片網址<input name="coverImage" type="url" defaultValue={source?.coverImage || ""} /></label>
      <div className="span-2"><span className="field-label">正文</span><RichTextEditor initialHtml={source?.contentHtml} /></div>
    </fieldset>
    <SeoFields key={`seo-${generated?.title || "stored"}`} post={source} />
    <div className="editor-actions"><button type="submit" name="intent" value="draft" className="button button-quiet">儲存草稿</button><button type="submit" name="intent" value="publish" className="button button-primary">發布文章</button></div>
  </form>;
}
