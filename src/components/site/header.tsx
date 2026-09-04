"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { SiteDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryHref } from "@/lib/content/category-tree";
import { LanguageSwitcher } from "./language-switcher";

type NavigationCategory = { id: string; name: string; segments: string[]; children?: NavigationCategory[] };

export function SiteHeader({ locale, dictionary, categories }: { locale: Locale; dictionary: SiteDictionary; categories: NavigationCategory[] }) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openCategoryId) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) setOpenCategoryId(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenCategoryId(null);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openCategoryId]);

  return <header className="site-header"><div className="nav-shell"><Link href={`/${locale}`} className="brand-mark">1Wiki</Link><nav ref={navigationRef} className="primary-navigation" aria-label={dictionary.navigation.primary}>{categories.map((category) => <NavigationCategoryItem category={category} dictionary={dictionary} locale={locale} isOpen={openCategoryId === category.id} key={category.id} onClose={() => setOpenCategoryId(null)} onToggle={(trigger) => {
    triggerRef.current = trigger;
    setOpenCategoryId((current) => current === category.id ? null : category.id);
  }} />)}</nav><LanguageSwitcher locale={locale} /><Link href="/login" className="admin-link">{dictionary.navigation.admin}</Link></div></header>;
}

function NavigationCategoryItem({ category, dictionary, locale, isOpen, onClose, onToggle }: { category: NavigationCategory; dictionary: SiteDictionary; locale: Locale; isOpen: boolean; onClose: () => void; onToggle: (trigger: HTMLButtonElement) => void }) {
  const menuId = useId();
  const children = category.children ?? [];
  if (children.length === 0) return <Link href={getCategoryHref(locale, category.segments)}>{category.name}</Link>;

  return <div className="nav-category-menu"><button type="button" className="nav-category-trigger" aria-expanded={isOpen} aria-controls={menuId} onClick={(event) => onToggle(event.currentTarget)}>{category.name}<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg></button>{isOpen ? <div id={menuId} className="nav-category-dropdown"><Link className="nav-category-all" href={getCategoryHref(locale, category.segments)} onClick={onClose}>{dictionary.navigation.allCategory} {category.name}</Link><NavigationCategoryLinks categories={children} locale={locale} onClose={onClose} /></div> : null}</div>;
}

function NavigationCategoryLinks({ categories, locale, onClose, depth = 1 }: { categories: NavigationCategory[]; locale: Locale; onClose: () => void; depth?: number }) {
  return <>{categories.map((category) => <div className={`nav-category-level-${depth}`} key={category.id}><Link href={getCategoryHref(locale, category.segments)} onClick={onClose}>{category.name}</Link>{category.children?.length ? <NavigationCategoryLinks categories={category.children} locale={locale} onClose={onClose} depth={depth + 1} /> : null}</div>)}</>;
}
