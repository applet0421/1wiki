import { listAuthorOptions } from "@/lib/content/authors";
import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
import { buildCategoryTree, flattenCategoryOptions } from "@/lib/content/category-tree";
import { listCategories } from "@/lib/content/repository";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getWeChatImportForUser } from "@/lib/wechat-import/repository";
import { parseRewriteDraft } from "@/lib/wechat-import/schema";
type Props = { searchParams: Promise<{ error?: string; locale?: string; wechatImportId?: string }> };
export default async function NewPostPage({ searchParams }: Props) {
  const [categories, params, authors, user] = await Promise.all([listCategories(prisma), searchParams, listAuthorOptions(prisma), getCurrentUser()]);
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  const options = flattenCategoryOptions(buildCategoryTree(categories.map((category) => ({
    id: category.id, locale: category.locale as Locale, name: category.name, slug: category.slug,
    description: category.description, parentId: category.parentId, sortOrder: category.sortOrder,
    showInNavigation: category.showInNavigation, directPostCount: category._count.posts,
  }))));
  const imported = params.wechatImportId && user ? await getWeChatImportForUser(prisma, params.wechatImportId, user.id) : null;
  const editorDraft = imported?.editorDraft && typeof imported.editorDraft === "object" && !Array.isArray(imported.editorDraft) ? imported.editorDraft as Record<string, unknown> : null;
  const draft = editorDraft ? parseRewriteDraft({
    title: editorDraft.title, slug: editorDraft.slug, excerpt: editorDraft.excerpt, blocks: editorDraft.blocks,
    seoTitle: editorDraft.seoTitle, seoDescription: editorDraft.seoDescription, seoKeywords: editorDraft.seoKeywords, needsVerification: editorDraft.needsVerification,
  }) : null;
  const generated = draft && editorDraft ? { title: draft.title, slug: draft.slug, excerpt: draft.excerpt, contentHtml: typeof editorDraft.contentHtml === "string" ? editorDraft.contentHtml : "", seoTitle: draft.seoTitle, seoDescription: draft.seoDescription, seoKeywords: draft.seoKeywords } : undefined;
  return <section><p className="eyebrow">新增內容</p><h1>建立文章</h1>{generated ? <p className="form-success">已載入微信改寫草稿；請確認內容後儲存或發布。</p> : null}<PostEditor authors={authors} locale={locale} categories={options} error={params.error} provider={process.env.LLM_PROVIDER || "deepseek"} initialGenerated={generated} initialCoverImage={typeof editorDraft?.coverImage === "string" ? editorDraft.coverImage : undefined} sourceImportId={generated ? imported?.id : undefined} showAIGenerator={!generated} /></section>;
}
