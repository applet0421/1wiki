"use client";

import { useState } from "react";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type FilterCategory = {
  id: string;
  locale: Locale;
  name: string;
};

type PostFiltersProps = {
  categories: FilterCategory[];
  initialLocale?: Locale;
  initialCategory?: string;
};

export function PostFilters({ categories, initialLocale, initialCategory }: PostFiltersProps) {
  const [locale, setLocale] = useState<Locale | "">(initialLocale || "");
  const [category, setCategory] = useState(initialCategory || "");
  const visibleCategories = locale
    ? categories.filter((item) => item.locale === locale)
    : categories;

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
      <label>文章分類<select name="category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部分類</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{locale ? item.name : `${item.name}（${getLocaleConfig(item.locale).label}）`}</option>)}</select></label>
      <button className="button button-quiet" type="submit">篩選</button>
    </form>
  );
}
