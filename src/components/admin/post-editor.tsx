import { savePostAction } from "@/app/admin/posts/actions";
import { RichTextEditor } from "./rich-text-editor";
import { SeoFields } from "./seo-fields";
import { TitleSlugFields } from "./title-slug-fields";

type CategoryOption = { id: string; name: string };
type EditablePost = { id: string; title: string; slug: string; excerpt: string; contentHtml: string; coverImage: string | null; categoryId: string; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; canonicalUrl: string | null };

export function PostEditor({ categories, post, error }: { categories: CategoryOption[]; post?: EditablePost; error?: string }) {
  return <form action={savePostAction} className="admin-grid">
    {post ? <input type="hidden" name="id" value={post.id} /> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    <fieldset className="panel form-grid"><legend>文章內容</legend>
      <TitleSlugFields initialTitle={post?.title} initialSlug={post?.slug} />
      <label>分類<select name="categoryId" defaultValue={post?.categoryId || ""} required><option value="" disabled>選擇分類</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="span-2">摘要<textarea name="excerpt" defaultValue={post?.excerpt || ""} rows={3} maxLength={320} /></label>
      <label className="span-2">封面圖片網址<input name="coverImage" type="url" defaultValue={post?.coverImage || ""} /></label>
      <div className="span-2"><span className="field-label">正文</span><RichTextEditor initialHtml={post?.contentHtml} /></div>
    </fieldset>
    <SeoFields post={post} />
    <div className="editor-actions"><button type="submit" name="intent" value="draft" className="button button-quiet">儲存草稿</button><button type="submit" name="intent" value="publish" className="button button-primary">發布文章</button></div>
  </form>;
}
