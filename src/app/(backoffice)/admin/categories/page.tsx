import { CategoryManager, type CategoryFeedback } from "@/components/admin/category-manager";
import { buildCategoryTree } from "@/lib/content/category-tree";
import { listCategories } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, getLocaleConfig, isLocale, supportedLocales } from "@/lib/i18n/config";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

type Props = {
  searchParams: Promise<{ error?: string; success?: string; locale?: string }>;
};

const successMessages = {
  created: "分類已建立。",
  updated: "分類已更新。",
  deleted: "分類已刪除。",
} as const;

function getFeedback(params: Awaited<Props["searchParams"]>): CategoryFeedback {
  if (params.error) return { kind: "error", message: params.error };
  if (params.success && params.success in successMessages) {
    return {
      kind: "success",
      message: successMessages[params.success as keyof typeof successMessages],
    };
  }
  return null;
}

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale;
  const categories = await listCategories(prisma, locale);
  const tree = buildCategoryTree(categories.map((category) => ({
    id: category.id,
    locale,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    sortOrder: category.sortOrder,
    showInNavigation: category.showInNavigation,
    directPostCount: category._count.posts,
  })));

  return (
    <section className="admin-grid">
      <div>
        <p className="eyebrow">內容架構</p>
        <h1>分類管理</h1>
      </div>
      <form method="get" className="panel filter-row">
        <label>
          內容語系
          <select name="locale" defaultValue={locale}>
            {supportedLocales.map((value) => (
              <option key={value} value={value}>{getLocaleConfig(value).label}</option>
            ))}
          </select>
        </label>
        <button className="button button-quiet" type="submit">篩選</button>
      </form>
      <CategoryManager
        locale={locale}
        categories={tree}
        feedback={getFeedback(params)}
        createAction={createCategoryAction}
        updateAction={updateCategoryAction}
        deleteAction={deleteCategoryAction}
      />
    </section>
  );
}
