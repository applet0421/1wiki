"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createCategory, deleteCategory, getPublicCategoryPath, updateCategory } from "@/lib/content/repository";
import { localeSchema } from "@/lib/content/schema";
import { slugifyTitle } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { revalidatePublicContent } from "@/lib/content/public-invalidation";
import { enqueuePublicInvalidation } from "@/lib/content/public-invalidation-outbox";

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

async function refreshCategories(locale: Locale, categoryId?: string) {
  const categoryPath = categoryId ? await getPublicCategoryPath(prisma, categoryId) : null;
  revalidatePublicContent({ locale, categoryPaths: categoryPath ? [categoryPath.path] : [] });
  return enqueuePublicInvalidation(prisma, { locale, categoryPaths: categoryPath ? [categoryPath.path] : [] });
}

export async function createCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    const created = await createCategory(prisma, categoryInput(formData));
    await refreshCategories(locale, created?.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類建立失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  redirect(categoriesUrl(locale, { success: "created" }));
}

export async function updateCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    const id = String(formData.get("id") || "");
    await updateCategory(prisma, id, categoryInput(formData));
    await refreshCategories(locale, id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類更新失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  redirect(categoriesUrl(locale, { success: "updated" }));
}

export async function deleteCategoryAction(formData: FormData) {
  await requireUser();
  const locale = requestedLocale(formData);
  try {
    const id = String(formData.get("id") || "");
    const categoryPath = await getPublicCategoryPath(prisma, id);
    await deleteCategory(prisma, id);
    revalidatePublicContent({ locale, categoryPaths: categoryPath ? [categoryPath.path] : [] });
    await enqueuePublicInvalidation(prisma, { locale, categoryPaths: categoryPath ? [categoryPath.path] : [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分類刪除失敗";
    redirect(categoriesUrl(locale, { error: message }));
  }
  redirect(categoriesUrl(locale, { success: "deleted" }));
}
