import { prisma } from "@/lib/db/prisma";
import { PostEditor } from "@/components/admin/post-editor";
import { buildCategoryTree, flattenCategoryOptions } from "@/lib/content/category-tree";
import { listCategories } from "@/lib/content/repository";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
type Props = { searchParams: Promise<{ error?: string; locale?: string }> };
export default async function NewPostPage({ searchParams }: Props) {
  const [categories, params] = await Promise.all([listCategories(prisma), searchParams]);
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  const options = flattenCategoryOptions(buildCategoryTree(categories.map((category) => ({
    id: category.id, locale: category.locale as Locale, name: category.name, slug: category.slug,
    description: category.description, parentId: category.parentId, sortOrder: category.sortOrder,
    showInNavigation: category.showInNavigation, directPostCount: category._count.posts,
  }))));
  return <section><p className="eyebrow">新增內容</p><h1>建立文章</h1><PostEditor locale={locale} categories={options} error={params.error} provider={process.env.LLM_PROVIDER || "deepseek"} /></section>;
}
