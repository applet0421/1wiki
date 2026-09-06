"use client";

import type { CategoryOption } from "@/lib/content/category-tree";
import type { Locale } from "@/lib/i18n/config";

type CategorySelectProps = {
  name: "category" | "categoryId";
  locale: Locale | "";
  categories: CategoryOption[];
  value?: string;
  includeAll?: boolean;
  emptyLabel?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

export function CategorySelect({
  name,
  locale,
  categories,
  value,
  includeAll = false,
  emptyLabel,
  required = false,
  onChange,
}: CategorySelectProps) {
  const visibleCategories = locale
    ? categories.filter((category) => category.locale === locale)
    : categories;
  const controlled = Boolean(onChange);

  return (
    <select
      name={name}
      value={controlled ? (value || "") : undefined}
      defaultValue={controlled ? undefined : (value || "")}
      required={required}
      onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
    >
      <option value="" disabled={!includeAll}>
        {emptyLabel || (includeAll ? "全部分類" : "選擇分類")}
      </option>
      {visibleCategories.map((category) => (
        <option key={category.id} value={category.id}>{category.label}</option>
      ))}
    </select>
  );
}
