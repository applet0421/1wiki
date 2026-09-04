import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> };
export default async function EditPostPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [post, categories] = await Promise.all([prisma.post.findUnique({ where: { id } }), prisma.category.findMany({ select: { id: true, name: true, locale: true }, orderBy: { name: "asc" } })]);
  if (!post) notFound();
  return <section><p className="eyebrow">編輯內容</p><h1>{post.title}</h1>{query.success === "generated" ? <p className="form-success">AI 草稿已建立，請檢查內容後再發布。</p> : null}<PostEditor locale={post.locale as "zh-tw" | "en" | "ja"} categories={categories} post={post} error={query.error} provider={process.env.LLM_PROVIDER || "deepseek"} /></section>;
}
