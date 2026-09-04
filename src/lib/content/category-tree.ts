import type { Locale } from "@/lib/i18n/config";

export type CategoryRow = {
  id: string;
  locale: Locale;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  showInNavigation: boolean;
  directPostCount: number;
};

export type CategoryTreeItem = CategoryRow & {
  depth: 1 | 2 | 3;
  segments: string[];
  aggregatePostCount: number;
  children: CategoryTreeItem[];
};

export type CategoryOption = {
  id: string;
  locale: Locale;
  label: string;
  depth: 1 | 2 | 3;
  segments: string[];
};

function byPosition(left: CategoryRow, right: CategoryRow): number {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}

export function buildCategoryTree(rows: CategoryRow[]): CategoryTreeItem[] {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  if (rowById.size !== rows.length) throw new Error("分類資料包含無效的父子關係");

  const childrenByParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    if (row.parentId) {
      const parent = rowById.get(row.parentId);
      if (!parent || parent.locale !== row.locale) throw new Error("分類資料包含無效的父子關係");
    }
    const siblings = childrenByParent.get(row.parentId) || [];
    siblings.push(row);
    childrenByParent.set(row.parentId, siblings);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();

  function build(row: CategoryRow, depth: number, segments: string[]): CategoryTreeItem {
    if (visiting.has(row.id) || depth > 3) throw new Error("分類資料包含無效的父子關係");
    visiting.add(row.id);

    const nextSegments = [...segments, row.slug];
    const children = (childrenByParent.get(row.id) || [])
      .sort(byPosition)
      .map((child) => build(child, depth + 1, nextSegments));

    visiting.delete(row.id);
    visited.add(row.id);
    return {
      ...row,
      depth: depth as 1 | 2 | 3,
      segments: nextSegments,
      aggregatePostCount: row.directPostCount + children.reduce((total, child) => total + child.aggregatePostCount, 0),
      children,
    };
  }

  const tree = (childrenByParent.get(null) || []).sort(byPosition).map((row) => build(row, 1, []));
  if (visited.size !== rows.length) throw new Error("分類資料包含無效的父子關係");
  return tree;
}

export function flattenCategoryOptions(tree: CategoryTreeItem[]): CategoryOption[] {
  return tree.flatMap((item) => [
    {
      id: item.id,
      locale: item.locale,
      label: `${"—".repeat(item.depth - 1)}${item.depth > 1 ? " " : ""}${item.name}`,
      depth: item.depth,
      segments: item.segments,
    },
    ...flattenCategoryOptions(item.children),
  ]);
}

export function getCategoryHref(locale: Locale, segments: string[]): string {
  return `/${locale}/category/${segments.join("/")}`;
}
