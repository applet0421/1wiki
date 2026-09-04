"use client";

import { useState } from "react";
import type { CategoryOption } from "@/lib/content/category-tree";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";
import { CategorySelect } from "./category-select";

type PostFiltersProps = {
  categories: CategoryOption[];
  initialLocale?: Locale;
  initialCategory?: string;
};

export function PostFilters({ categories, initialLocale, initialCategory }: PostFiltersProps) {
  const [locale, setLocale] = useState<Locale | "">(initialLocale || "");
  const [category, setCategory] = useState(initialCategory || "");
  const categoryOptions = locale ? categories : categories.map((item) => ({
    ...item,
    label: `${item.label}（${getLocaleConfig(item.locale).label}）`,
  }));

  function changeLocale(nextLocale: string) {
    const normalizedLocale = nextLocale as Locale | "";
    setLocale(normalizedLocale);
    if (category && normalizedLocale && !categories.some((item) => item.id === category && item.locale === normalizedLocale)) {
      setCategory("");
    }
  }

  return (
    <form method="get" className="panel filter-row">
      <label>內容語系<select name="locale" value={locale} onChange={(event) => changeLocale(event.target.value)}><option value="">全部語系</option>{supportedLocales.map((value) => <option key={value} value={value}>{getLocaleConfig(value).label}</option>)}</select></label>
      <label>文章分類<CategorySelect name="category" locale={locale} categories={categoryOptions} value={category} includeAll onChange={setCategory} /></label>
      <button className="button button-quiet" type="submit">篩選</button>
    </form>
  );
}
