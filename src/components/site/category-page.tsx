import Link from "next/link";
import { getCategoryHref } from "@/lib/content/category-tree";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { ArticleCard } from "./article-card";
import { CategoryBreadcrumbs } from "./category-breadcrumbs";

type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type CategoryChild = PublicCategory & { aggregatePostCount: number };

type CategoryPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  category: {
    name: string;
    slug: string;
    parent?: {
      name: string;
      slug: string;
      parent?: { name: string; slug: string; parent?: null } | null;
    } | null;
  };
};

type CategoryPageData = {
  category: PublicCategory;
  ancestors: PublicCategory[];
  children: CategoryChild[];
  posts: CategoryPost[];
};

export function CategoryPageContent({
  data,
  locale,
  dictionary,
}: {
  data: CategoryPageData;
  locale: Locale;
  dictionary: SiteDictionary;
}) {
  const segments = [...data.ancestors.map(({ slug }) => slug), data.category.slug];

  return (
    <main className="public-main">
      <CategoryBreadcrumbs locale={locale} ancestors={data.ancestors} current={data.category} />
      <header className="page-hero">
        <p className="eyebrow">{dictionary.category.eyebrow}</p>
        <h1>{data.category.name}</h1>
        <p>{data.category.description}</p>
      </header>
      {data.children.length > 0 ? (
        <section className="category-grid" aria-label="子分類">
          {data.children.map((child) => (
            <Link className="category-card" href={getCategoryHref(locale, [...segments, child.slug])} key={child.id}>
              <span>{child.aggregatePostCount} 篇文章</span>
              <h2>{child.name}</h2>
              <p>{child.description}</p>
            </Link>
          ))}
        </section>
      ) : null}
      <div className="article-grid">
        {data.posts.map((post) => <ArticleCard key={post.id} post={post} locale={locale} dictionary={dictionary} />)}
      </div>
    </main>
  );
}
