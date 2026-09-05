"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePost, savePost } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { localeSchema } from "@/lib/content/schema";

function field(formData: FormData, name: string): string { return String(formData.get(name) || ""); }
function completeSeo(input: { title: string; excerpt: string; contentHtml: string; seoTitle: string; seoDescription: string; seoKeywords: string }) {
  const plainText = input.contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    seoTitle: input.seoTitle.trim() || input.title.trim(),
    seoDescription: input.seoDescription.trim() || (input.excerpt.trim() || plainText.slice(0, 170)),
    seoKeywords: input.seoKeywords.trim() || input.title.trim(),
  };
}
function completeImageAlt(contentHtml: string, title: string): string {
  const fallback = `${title.trim()} 示意圖`;
  return contentHtml.replace(/<img\b([^>]*?)>/giu, (tag, attributes: string) => {
    if (/\balt\s*=\s*["'][^"']+[^"']*["']/iu.test(attributes)) return tag;
    if (/\balt\s*=\s*["']\s*["']/iu.test(attributes)) return `<img${attributes.replace(/\balt\s*=\s*["']\s*["']/iu, `alt="${fallback.replace(/"/g, "&quot;")}"`)}>`;
    return `<img${attributes} alt="${fallback.replace(/"/g, "&quot;")}">`;
  });
}
async function requireContentUser() { const user = await getCurrentUser(); if (!user) redirect("/login"); if (user.mustChangePassword) redirect("/change-password"); return user; }

export async function savePostAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id") || undefined;
  const title = field(formData, "title");
  const excerpt = field(formData, "excerpt");
  const rawContentHtml = field(formData, "contentHtml");
  const isPublishing = field(formData, "intent") === "publish";
  const contentHtml = isPublishing ? completeImageAlt(rawContentHtml, title) : rawContentHtml;
  const seo = isPublishing ? completeSeo({ title, excerpt, contentHtml, seoTitle: field(formData, "seoTitle"), seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords") }) : { seoTitle: field(formData, "seoTitle"), seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords") };
  try {
    await savePost(prisma, user.id, {
      id, locale: localeSchema.parse(field(formData, "locale")), title, slug: field(formData, "slug"), excerpt,
      contentHtml, coverImage: field(formData, "coverImage"),
      status: field(formData, "intent") === "publish" ? "PUBLISHED" : "DRAFT",
      bylineId: field(formData, "bylineId") || null, categoryId: field(formData, "categoryId"), ...seo, canonicalUrl: field(formData, "canonicalUrl"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章儲存失敗";
    redirect(`${id ? `/admin/posts/${id}` : "/admin/posts/new"}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/admin?success=saved");
}

export async function togglePostStatusAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id");
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) redirect("/admin?error=找不到文章");
  const isPublishing = field(formData, "status") === "PUBLISHED";
  const contentHtml = isPublishing ? completeImageAlt(current.contentHtml, current.title) : current.contentHtml;
  const seo = isPublishing ? completeSeo({ title: current.title, excerpt: current.excerpt, contentHtml, seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "", seoKeywords: current.seoKeywords || "" }) : { seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "", seoKeywords: current.seoKeywords || "" };
  try {
    await savePost(prisma, user.id, {
      id: current.id, locale: localeSchema.parse(current.locale), title: current.title, slug: current.slug, excerpt: current.excerpt, contentHtml,
      coverImage: current.coverImage || "", status: field(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      categoryId: current.categoryId, ...seo, canonicalUrl: current.canonicalUrl || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "狀態更新失敗";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireContentUser();
  try { await deletePost(prisma, field(formData, "id")); }
  catch (error) { const message = error instanceof Error ? error.message : "文章刪除失敗"; redirect(`/admin?error=${encodeURIComponent(message)}`); }
  revalidatePath("/", "layout");
  redirect("/admin");
}
