import { listAuthorOptions } from "@/lib/content/authors";
import { AIRewriter } from "@/components/admin/ai-rewriter";
import { buildCategoryTree, flattenCategoryOptions } from "@/lib/content/category-tree";
import { listCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import type { Locale } from "@/lib/i18n/config";

export default async function RewritePostPage() {
  const [categories, authors] = await Promise.all([listCategories(prisma), listAuthorOptions(prisma)]);
  const options = flattenCategoryOptions(buildCategoryTree(categories.map((category) => ({
    id: category.id, locale: category.locale as Locale, name: category.name, slug: category.slug,
    description: category.description, parentId: category.parentId, sortOrder: category.sortOrder,
    showInNavigation: category.showInNavigation, directPostCount: category._count.posts,
  }))));

  return <section>
    <p className="eyebrow">AI 內容工作台</p>
    <h1>AI 改寫文章</h1>
    <AIRewriter authors={authors} categories={options} provider={process.env.LLM_PROVIDER || "deepseek"} />
  </section>;
}
