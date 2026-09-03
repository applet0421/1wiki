type SeoPost = { seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null };
export function SeoFields({ post }: { post?: SeoPost }) {
  return <fieldset className="panel form-grid"><legend>SEO 設定</legend>
    <label>SEO 標題<input name="seoTitle" defaultValue={post?.seoTitle || ""} maxLength={70} /></label>
    <label className="span-2">Meta description<textarea name="seoDescription" defaultValue={post?.seoDescription || ""} maxLength={170} rows={3} /></label>
    <label>關鍵字<input name="seoKeywords" defaultValue={post?.seoKeywords || ""} maxLength={500} /></label>
    <label>Canonical URL<input name="canonicalUrl" type="url" defaultValue={post?.canonicalUrl || ""} /></label>
  </fieldset>;
}
