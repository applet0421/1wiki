"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createCategory, deleteCategory } from "@/lib/content/repository";
import { slugifyTitle } from "@/lib/content/slug";
import { prisma } from "@/lib/db/prisma";

async function requireUser() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }

export async function createCategoryAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "");
  try { await createCategory(prisma, { name, slug: slugifyTitle(String(formData.get("slug") || name)), description: String(formData.get("description") || "") }); }
  catch (error) { const message = error instanceof Error ? error.message : "分類建立失敗"; redirect(`/admin/categories?error=${encodeURIComponent(message)}`); }
  revalidatePath("/admin/categories"); redirect("/admin/categories?success=created");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireUser();
  try { await deleteCategory(prisma, String(formData.get("id") || "")); }
  catch (error) { const message = error instanceof Error ? error.message : "分類刪除失敗"; redirect(`/admin/categories?error=${encodeURIComponent(message)}`); }
  revalidatePath("/admin/categories"); redirect("/admin/categories");
}
