"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
export default function NotFound() { const params = useParams<{ locale?: string }>(); const locale = params.locale && isLocale(params.locale) ? params.locale : defaultLocale; const copy = getDictionary(locale).notFound; return <main className="auth-page"><div className="auth-card"><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="muted">{copy.description}</p><Link href={`/${locale}`} className="button button-primary">{copy.home}</Link></div></main>; }
