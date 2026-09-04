"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePost, savePost } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { localeSchema } from "@/lib/content/schema";

function field(formData: FormData, name: string): string { return String(formData.get(name) || ""); }
async function requireContentUser() { const user = await getCurrentUser(); if (!user) redirect("/login"); if (user.mustChangePassword) redirect("/change-password"); return user; }

export async function savePostAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id") || undefined;
  try {
    await savePost(prisma, user.id, {
      id, locale: localeSchema.parse(field(formData, "locale")), title: field(formData, "title"), slug: field(formData, "slug"), excerpt: field(formData, "excerpt"),
      contentHtml: field(formData, "contentHtml"), coverImage: field(formData, "coverImage"),
      status: field(formData, "intent") === "publish" ? "PUBLISHED" : "DRAFT",
      categoryId: field(formData, "categoryId"), seoTitle: field(formData, "seoTitle"),
      seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords"), canonicalUrl: field(formData, "canonicalUrl"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章儲存失敗";
    redirect(`${id ? `/admin/posts/${id}` : "/admin/posts/new"}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin");
  redirect("/admin?success=saved");
}

export async function togglePostStatusAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id");
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) redirect("/admin?error=找不到文章");
  try {
    await savePost(prisma, user.id, {
      id: current.id, locale: localeSchema.parse(current.locale), title: current.title, slug: current.slug, excerpt: current.excerpt, contentHtml: current.contentHtml,
      coverImage: current.coverImage || "", status: field(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      categoryId: current.categoryId, seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "",
      seoKeywords: current.seoKeywords || "", canonicalUrl: current.canonicalUrl || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "狀態更新失敗";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireContentUser();
  try { await deletePost(prisma, field(formData, "id")); }
  catch (error) { const message = error instanceof Error ? error.message : "文章刪除失敗"; redirect(`/admin?error=${encodeURIComponent(message)}`); }
  revalidatePath("/admin");
  redirect("/admin");
}
