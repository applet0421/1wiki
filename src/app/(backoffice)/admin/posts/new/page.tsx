import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
type Props = { searchParams: Promise<{ error?: string; locale?: string }> };
export default async function NewPostPage({ searchParams }: Props) {
  const [categories, params] = await Promise.all([prisma.category.findMany({ select: { id: true, name: true, locale: true }, orderBy: { name: "asc" } }), searchParams]);
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  return <section><p className="eyebrow">新增內容</p><h1>建立文章</h1><PostEditor locale={locale} categories={categories} error={params.error} provider={process.env.LLM_PROVIDER || "deepseek"} /></section>;
}
