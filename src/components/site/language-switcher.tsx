"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const switcherRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const languageLabel = getDictionary(locale).navigation.language;
  const currentLocaleLabel = getLocaleConfig(locale).label;

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <nav ref={switcherRef} className="language-switcher" aria-label={languageLabel}>
      <button
        ref={triggerRef}
        type="button"
        className="language-trigger"
        aria-label={`${languageLabel}：${currentLocaleLabel}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{currentLocaleLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </button>
      {isOpen ? (
        <div id={menuId} className="language-menu">
          {supportedLocales.map((value) => (
            <Link
              key={value}
              href={`/${value}`}
              aria-current={value === locale ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              <span>{getLocaleConfig(value).label}</span>
              {value === locale ? <span aria-hidden="true">✓</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
