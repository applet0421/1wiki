"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePost, savePost } from "@/lib/content/repository";
import { prisma } from "@/lib/db/prisma";
import { localeSchema } from "@/lib/content/schema";
import { normalizeArticleImageAlts } from "@/lib/content/image-alt";
import { articleUrl, enqueueGoogleSitemapNotification, enqueueSearchNotification } from "@/lib/search-engine/repository";
import { classifySearchEvent } from "@/lib/search-engine/notifications";
import { getSiteUrl } from "@/lib/config/site";
import { revalidatePublicContent } from "@/lib/content/public-invalidation";
import { enqueuePublicInvalidation } from "@/lib/content/public-invalidation-outbox";
import { inspectArticleLayout } from "@/lib/content/article-layout";

function field(formData: FormData, name: string): string { return String(formData.get(name) || ""); }
function completeSeo(input: { title: string; excerpt: string; contentHtml: string; seoTitle: string; seoDescription: string; seoKeywords: string }) {
  const plainText = input.contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    seoTitle: input.seoTitle.trim() || input.title.trim(),
    seoDescription: input.seoDescription.trim() || (input.excerpt.trim() || plainText.slice(0, 170)),
    seoKeywords: input.seoKeywords.trim() || input.title.trim(),
  };
}
async function requireContentUser() { const user = await getCurrentUser(); if (!user) redirect("/login"); if (user.mustChangePassword) redirect("/change-password"); return user; }

export async function savePostAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id") || undefined;
  const title = field(formData, "title");
  const excerpt = field(formData, "excerpt");
  const rawContentHtml = field(formData, "contentHtml");
  const isPublishing = field(formData, "intent") === "publish";
  const sourceImportId = field(formData, "sourceImportId") || null;
  if (sourceImportId) {
    const imported = await prisma.weChatImport.findFirst({ where: { id: sourceImportId, userId: user.id, status: "READY" }, select: { id: true } });
    if (!imported) redirect(`${id ? `/admin/posts/${id}` : "/admin/posts/new"}?error=${encodeURIComponent("匯入工作不可用或不屬於目前帳號")}`);
  }
  const previous = id ? await prisma.post.findUnique({ where: { id }, select: { status: true, locale: true, slug: true } }) : null;
  const contentHtml = isPublishing ? normalizeArticleImageAlts(rawContentHtml, title) : rawContentHtml;
  const layoutDiagnostics = inspectArticleLayout(contentHtml);
  if (layoutDiagnostics.length) console.warn("article-layout-diagnostics", { postId: id || "new", codes: layoutDiagnostics.map((item) => item.code) });
  const seo = isPublishing ? completeSeo({ title, excerpt, contentHtml, seoTitle: field(formData, "seoTitle"), seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords") }) : { seoTitle: field(formData, "seoTitle"), seoDescription: field(formData, "seoDescription"), seoKeywords: field(formData, "seoKeywords") };
  let saved: Awaited<ReturnType<typeof savePost>> | null = null;
  try {
    saved = await savePost(prisma, user.id, {
      id, locale: localeSchema.parse(field(formData, "locale")), title, slug: field(formData, "slug"), excerpt,
      contentHtml, coverImage: field(formData, "coverImage"),
      status: field(formData, "intent") === "publish" ? "PUBLISHED" : "DRAFT",
      bylineId: field(formData, "bylineId") || null, sourceImportId, categoryId: field(formData, "categoryId"), ...seo, canonicalUrl: field(formData, "canonicalUrl"),
    });
    const event = classifySearchEvent(previous?.status || "DRAFT", isPublishing ? "PUBLISHED" : "DRAFT");
    if (event && saved && (!saved.canonicalUrl || saved.canonicalUrl.startsWith(getSiteUrl()))) {
      await enqueueSearchNotification(prisma, articleUrl(saved.locale, saved.slug), event);
      await enqueueGoogleSitemapNotification(prisma);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章儲存失敗";
    redirect(`${id ? `/admin/posts/${id}` : "/admin/posts/new"}?error=${encodeURIComponent(message)}`);
  }
  revalidatePublicContent({
    locale: localeSchema.parse(saved?.locale ?? previous?.locale ?? "zh-tw"),
    articleSlugs: [previous?.slug ?? "", saved?.slug ?? ""],
  });
  await enqueuePublicInvalidation(prisma, {
    locale: localeSchema.parse(saved?.locale ?? previous?.locale ?? "zh-tw"),
    articleSlugs: [previous?.slug ?? "", saved?.slug ?? ""],
  });
  redirect("/admin?success=saved");
}

export async function togglePostStatusAction(formData: FormData) {
  const user = await requireContentUser();
  const id = field(formData, "id");
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) redirect("/admin?error=找不到文章");
  const isPublishing = field(formData, "status") === "PUBLISHED";
  const contentHtml = isPublishing ? normalizeArticleImageAlts(current.contentHtml, current.title) : current.contentHtml;
  const layoutDiagnostics = inspectArticleLayout(contentHtml);
  if (layoutDiagnostics.length) console.warn("article-layout-diagnostics", { postId: current.id, codes: layoutDiagnostics.map((item) => item.code) });
  const seo = isPublishing ? completeSeo({ title: current.title, excerpt: current.excerpt, contentHtml, seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "", seoKeywords: current.seoKeywords || "" }) : { seoTitle: current.seoTitle || "", seoDescription: current.seoDescription || "", seoKeywords: current.seoKeywords || "" };
  try {
    await savePost(prisma, user.id, {
      id: current.id, locale: localeSchema.parse(current.locale), title: current.title, slug: current.slug, excerpt: current.excerpt, contentHtml,
      coverImage: current.coverImage || "", status: field(formData, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      categoryId: current.categoryId, ...seo, canonicalUrl: current.canonicalUrl || "",
    });
    const event = classifySearchEvent(current.status, isPublishing ? "PUBLISHED" : "DRAFT");
    if (event && (!current.canonicalUrl || current.canonicalUrl.startsWith(getSiteUrl()))) {
      await enqueueSearchNotification(prisma, articleUrl(current.locale, current.slug), event);
      await enqueueGoogleSitemapNotification(prisma);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "狀態更新失敗";
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }
  const locale = localeSchema.parse(current.locale);
  revalidatePublicContent({ locale, articleSlugs: [current.slug] });
  await enqueuePublicInvalidation(prisma, { locale, articleSlugs: [current.slug] });
  redirect("/admin");
}

export async function deletePostAction(formData: FormData) {
  await requireContentUser();
  const id = field(formData, "id");
  const current = await prisma.post.findUnique({ where: { id }, select: { locale: true, slug: true } });
  try { await deletePost(prisma, field(formData, "id")); }
  catch (error) { const message = error instanceof Error ? error.message : "文章刪除失敗"; redirect(`/admin?error=${encodeURIComponent(message)}`); }
  if (current) {
    const locale = localeSchema.parse(current.locale);
    revalidatePublicContent({ locale, articleSlugs: [current.slug] });
    await enqueuePublicInvalidation(prisma, { locale, articleSlugs: [current.slug] });
  }
  redirect("/admin");
}
