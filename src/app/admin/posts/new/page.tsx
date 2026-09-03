import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
type Props = { searchParams: Promise<{ error?: string }> };
export default async function NewPostPage({ searchParams }: Props) {
  const [categories, params] = await Promise.all([prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }), searchParams]);
  return <section><p className="eyebrow">新增內容</p><h1>建立文章</h1><PostEditor categories={categories} error={params.error} /></section>;
}
