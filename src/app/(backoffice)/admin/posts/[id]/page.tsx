import { listAuthorOptions } from "@/lib/content/authors";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
import { buildCategoryTree, flattenCategoryOptions } from "@/lib/content/category-tree";
import { listCategories } from "@/lib/content/repository";
import type { Locale } from "@/lib/i18n/config";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> };
export default async function EditPostPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [post, categories, authors] = await Promise.all([prisma.post.findUnique({ where: { id } }), listCategories(prisma), listAuthorOptions(prisma)]);
  if (!post) notFound();
  const options = flattenCategoryOptions(buildCategoryTree(categories.map((category) => ({
    id: category.id, locale: category.locale as Locale, name: category.name, slug: category.slug,
    description: category.description, parentId: category.parentId, sortOrder: category.sortOrder,
    showInNavigation: category.showInNavigation, directPostCount: category._count.posts,
  }))));
  return <section><p className="eyebrow">編輯內容</p><h1>{post.title}</h1>{query.success === "generated" ? <p className="form-success">AI 草稿已建立，請檢查內容後再發布。</p> : null}<PostEditor authors={authors} locale={post.locale as Locale} categories={options} post={post} error={query.error} provider={process.env.LLM_PROVIDER || "deepseek"} /></section>;
}
