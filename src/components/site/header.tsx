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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTabletMoreOpen, setIsTabletMoreOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!openCategoryId) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!navigationRef.current?.contains(event.target as Node)) setOpenCategoryId(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
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

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMobileMenuOpen(false);
      mobileMenuTriggerRef.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileMenuOpen]);

  const categoryItem = (category: NavigationCategory) => <NavigationCategoryItem category={category} dictionary={dictionary} locale={locale} isOpen={openCategoryId === category.id} key={category.id} onClose={() => setOpenCategoryId(null)} onOpen={(trigger) => { triggerRef.current = trigger; setOpenCategoryId(category.id); }} onToggle={(trigger) => {
    triggerRef.current = trigger;
    setOpenCategoryId((current) => current === category.id ? null : category.id);
  }} />;
  const compactCategories = categories.slice(0, 2);
  const overflowCategories = categories.slice(2);

  return <header className="site-header"><div className="nav-shell"><Link href={`/${locale}`} className="brand-mark">1Wiki</Link><nav ref={navigationRef} className="primary-navigation" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpenCategoryId(null); setIsTabletMoreOpen(false); } }} aria-label={dictionary.navigation.primary}><div className="desktop-navigation-items">{categories.map(categoryItem)}</div><div className="tablet-navigation-items">{compactCategories.map(categoryItem)}<div className="tablet-more-menu"><button type="button" className="tablet-more-trigger" aria-expanded={isTabletMoreOpen} onClick={() => setIsTabletMoreOpen((open) => !open)}>{dictionary.navigation.more}</button>{isTabletMoreOpen ? <div className="tablet-more-dropdown">{overflowCategories.map(categoryItem)}</div> : null}</div></div></nav><div className="nav-actions"><LanguageSwitcher locale={locale} /><Link href="/login" className="admin-link">{dictionary.navigation.admin}</Link><button ref={mobileMenuTriggerRef} type="button" className="mobile-menu-trigger" aria-label={isMobileMenuOpen ? dictionary.navigation.closeMenu : dictionary.navigation.openMenu} aria-expanded={isMobileMenuOpen} aria-controls={mobileMenuId} onClick={() => setIsMobileMenuOpen((open) => !open)}><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /></button></div></div>{isMobileMenuOpen ? <div id={mobileMenuId} className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label={dictionary.navigation.primary}><nav aria-label={dictionary.navigation.primary}>{categories.map(categoryItem)}</nav></div> : null}</header>;
}

function NavigationCategoryItem({ category, dictionary, locale, isOpen, onClose, onOpen, onToggle }: { category: NavigationCategory; dictionary: SiteDictionary; locale: Locale; isOpen: boolean; onClose: () => void; onOpen: (trigger: HTMLButtonElement) => void; onToggle: (trigger: HTMLButtonElement) => void }) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const children = category.children ?? [];
  if (children.length === 0) return <Link href={getCategoryHref(locale, category.segments)}>{category.name}</Link>;

  return <div className="nav-category-menu" onMouseEnter={() => { if (buttonRef.current && window.matchMedia("(hover: hover)").matches) onOpen(buttonRef.current); }} onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) onClose(); }}><Link className="nav-category-link" href={getCategoryHref(locale, category.segments)}>{category.name}</Link><button ref={buttonRef} type="button" className="nav-category-trigger" aria-label={category.name} aria-expanded={isOpen} aria-controls={menuId} onClick={(event) => { if (event.detail > 0 && window.matchMedia("(hover: hover)").matches) onOpen(event.currentTarget); else onToggle(event.currentTarget); }}><svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg></button>{isOpen ? <div id={menuId} className="nav-category-dropdown"><Link className="nav-category-all" href={getCategoryHref(locale, category.segments)} onClick={onClose}>{dictionary.navigation.allCategory} {category.name}</Link><NavigationCategoryLinks categories={children} locale={locale} onClose={onClose} /></div> : null}</div>;
}

function NavigationCategoryLinks({ categories, locale, onClose }: { categories: NavigationCategory[]; locale: Locale; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <>{categories.map((category) => <NavigationBranch key={category.id} category={category} locale={locale} onClose={onClose} isOpen={openId === category.id} onOpen={() => setOpenId(category.id)} onCollapse={() => setOpenId(null)} />)}</>;
}

function NavigationBranch({ category, locale, onClose, isOpen, onOpen, onCollapse }: { category: NavigationCategory; locale: Locale; onClose: () => void; isOpen: boolean; onOpen: () => void; onCollapse: () => void }) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [opensLeft, setOpensLeft] = useState(false);
  const children = category.children ?? [];

  useEffect(() => {
    if (isOpen && panelRef.current) {
      const parent = panelRef.current.parentElement!.getBoundingClientRect();
      setOpensLeft(parent.right + panelRef.current.offsetWidth > window.innerWidth - 16);
    }
  }, [isOpen]);

  return <div className="nav-category-branch" onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) onOpen(); }} onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) onCollapse(); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onCollapse(); }} onKeyDown={(event) => {
    if ((event.key === "Escape" || event.key === "ArrowLeft") && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      onCollapse();
      triggerRef.current?.focus();
    } else if (event.key === "ArrowRight" && children.length && !isOpen) {
      event.preventDefault();
      onOpen();
    }
  }}>
    <div className="nav-category-row" data-expanded={isOpen && children.length > 0}>
      <Link href={getCategoryHref(locale, category.segments)} onClick={onClose}>{category.name}</Link>
      {children.length > 0 ? <button ref={triggerRef} type="button" className="nav-subcategory-trigger" aria-label={category.name} aria-controls={menuId} aria-expanded={isOpen} onClick={(event) => { if (event.detail > 0 && window.matchMedia("(hover: hover)").matches) onOpen(); else if (isOpen) onCollapse(); else onOpen(); }}><svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg></button> : null}
    </div>
    {children.length > 0 && isOpen ? <div ref={panelRef} id={menuId} className="nav-category-submenu" data-side={opensLeft ? "left" : "right"}><NavigationCategoryLinks categories={children} locale={locale} onClose={onClose} /></div> : null}
  </div>;
}
