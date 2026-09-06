"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteSitePage, saveSitePage } from "@/lib/content/pages";
import { localeSchema } from "@/lib/content/schema";
import { prisma } from "@/lib/db/prisma";
import { enqueuePublicInvalidation } from "@/lib/content/public-invalidation-outbox";
import { revalidatePublicContent } from "@/lib/content/public-invalidation";
import { isLocale, type Locale } from "@/lib/i18n/config";

function field(formData: FormData, name: string): string { return String(formData.get(name) || ""); }

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

function pageUrl(locale: Locale, params: Record<string, string>) {
  const search = new URLSearchParams({ locale, ...params });
  return `/admin/pages?${search.toString()}`;
}

function requestedLocale(formData: FormData): Locale {
  const value = field(formData, "locale");
  return isLocale(value) ? value : "zh-tw";
}

export async function saveSitePageAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  const id = field(formData, "id") || undefined;
  const previous = id ? await prisma.sitePage.findUnique({ where: { id }, select: { locale: true, slug: true } }) : null;
  const status = field(formData, "intent") === "publish" ? "PUBLISHED" : "DRAFT";
  let saved;
  try {
    saved = await saveSitePage(prisma, {
      id, locale: localeSchema.parse(locale), title: field(formData, "title"), slug: field(formData, "slug"), excerpt: field(formData, "excerpt"), contentHtml: field(formData, "contentHtml"), status,
      seoTitle: field(formData, "seoTitle"), seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords"), canonicalUrl: field(formData, "canonicalUrl"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "網站頁面儲存失敗";
    redirect(id ? `/admin/pages/${id}?error=${encodeURIComponent(message)}` : `/admin/pages/new?locale=${locale}&error=${encodeURIComponent(message)}`);
  }
  const savedLocale = localeSchema.parse(saved.locale);
  revalidatePublicContent({ locale: savedLocale, pageSlugs: [previous?.slug || "", saved.slug] });
  await enqueuePublicInvalidation(prisma, { locale: savedLocale, pageSlugs: [previous?.slug || "", saved.slug] });
  redirect(pageUrl(savedLocale, { success: id ? "updated" : "created" }));
}

export async function toggleSitePageStatusAction(formData: FormData) {
  await requireUser();
  const id = field(formData, "id");
  const current = await prisma.sitePage.findUnique({ where: { id } });
  if (!current || !isLocale(current.locale)) redirect("/admin/pages?error=找不到指定頁面");
  try {
    const saved = await saveSitePage(prisma, { ...current, locale: current.locale, status: field(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT", seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "", seoKeywords: current.seoKeywords || "", canonicalUrl: current.canonicalUrl || "" });
    const savedLocale = localeSchema.parse(saved.locale);
    revalidatePublicContent({ locale: savedLocale, pageSlugs: [saved.slug] });
    await enqueuePublicInvalidation(prisma, { locale: savedLocale, pageSlugs: [saved.slug] });
  } catch (error) {
    redirect(`/admin/pages?error=${encodeURIComponent(error instanceof Error ? error.message : "狀態更新失敗")}`);
  }
  redirect(`/admin/pages?locale=${current.locale}`);
}

export async function deleteSitePageAction(formData: FormData) {
  await requireUser();
  const id = field(formData, "id");
  const current = await prisma.sitePage.findUnique({ where: { id }, select: { locale: true, slug: true } });
  try { await deleteSitePage(prisma, id); } catch (error) { redirect(`/admin/pages?error=${encodeURIComponent(error instanceof Error ? error.message : "網站頁面刪除失敗")}`); }
  if (current && isLocale(current.locale)) {
    revalidatePublicContent({ locale: current.locale, pageSlugs: [current.slug] });
    await enqueuePublicInvalidation(prisma, { locale: current.locale, pageSlugs: [current.slug] });
  }
  redirect(`/admin/pages?locale=${current && isLocale(current.locale) ? current.locale : "zh-tw"}&success=deleted`);
}
