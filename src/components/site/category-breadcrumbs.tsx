import Link from "next/link";
import { getCategoryHref } from "@/lib/content/category-tree";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type BreadcrumbCategory = { id?: string; name: string; slug: string };

export function CategoryBreadcrumbs({
  locale,
  ancestors,
  current,
  articleTitle,
}: {
  locale: Locale;
  ancestors: BreadcrumbCategory[];
  current: BreadcrumbCategory;
  articleTitle?: string;
}) {
  const categories = [...ancestors, current];
  const homeLabel = getDictionary(locale).article.home;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href={`/${locale}`}>{homeLabel}</Link>
      {categories.map((category, index) => {
        const isCurrentPage = index === categories.length - 1 && !articleTitle;
        const href = getCategoryHref(locale, categories.slice(0, index + 1).map(({ slug }) => slug));
        return (
          <span className="breadcrumb-item" key={category.id || href}>
            <span aria-hidden>／</span>
            {isCurrentPage
              ? <span aria-current="page">{category.name}</span>
              : <Link href={href}>{category.name}</Link>}
          </span>
        );
      })}
      {articleTitle ? <span className="breadcrumb-item"><span aria-hidden>／</span><span aria-current="page">{articleTitle}</span></span> : null}
    </nav>
  );
}
