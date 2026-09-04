"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createCategory, deleteCategory, updateCategory } from "@/lib/content/repository";
import { localeSchema } from "@/lib/content/schema";
import { slugifyTitle } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function requestedLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") || "");
  return isLocale(value) ? value : defaultLocale;
}

function categoryInput(formData: FormData) {
  const name = String(formData.get("name") || "");
  const parentId = String(formData.get("parentId") || "");

  return {
    locale: localeSchema.parse(String(formData.get("locale") || "")),
    name,
    slug: slugifyTitle(String(formData.get("slug") || name)),
    description: String(formData.get("description") || ""),
    parentId: parentId || null,
    showInNavigation: !parentId && formData.get("showInNavigation") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
}

function categoriesUrl(locale: Locale, parameters: Record<string, string>): string {
  const search = new URLSearchParams({ locale, ...parameters });
  return `/admin/categories?${search.toString()}`;
}

function refreshCategories() {
  revalidatePath("/", "layout");
}

export async function createCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    await createCategory(prisma, categoryInput(formData));
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類建立失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  refreshCategories();
  redirect(categoriesUrl(locale, { success: "created" }));
}

export async function updateCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    await updateCategory(prisma, String(formData.get("id") || ""), categoryInput(formData));
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類更新失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  refreshCategories();
  redirect(categoriesUrl(locale, { success: "updated" }));
}

export async function deleteCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    await deleteCategory(prisma, String(formData.get("id") || ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類刪除失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  refreshCategories();
  redirect(categoriesUrl(locale, { success: "deleted" }));
}
