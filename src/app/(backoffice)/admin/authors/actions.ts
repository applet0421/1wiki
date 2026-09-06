"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { saveAuthor, setAuthorArchived } from "@/lib/content/authors";
import { slugifyTitle } from "@/lib/content/slug";
import { localeSchema } from "@/lib/content/schema";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { revalidatePublicContent } from "@/lib/content/public-invalidation";
import { enqueuePublicInvalidation } from "@/lib/content/public-invalidation-outbox";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
}

export async function saveAuthorAction(_previous: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  await requireUser();
  let locale: Locale;
  const id = String(formData.get("id") || "") || undefined;
  const previous = id ? await prisma.author.findUnique({ where: { id }, select: { slug: true } }) : null;
  const slug = slugifyTitle(String(formData.get("slug") || formData.get("name") || ""));
  try {
    locale = localeSchema.parse(formData.get("locale"));
    const name = String(formData.get("name") || "");
    await saveAuthor(prisma, {
      id,
      locale,
      name,
      slug,
      contentHtml: String(formData.get("contentHtml") || ""),
    });
  } catch (error) {
    return { error: error instanceof ZodError ? error.issues[0].message : error instanceof Error ? error.message : "作者儲存失敗" };
  }
  revalidatePublicContent({ locale });
  await enqueuePublicInvalidation(prisma, { locale, authorSlugs: [previous?.slug ?? "", slug] });
  redirect(`/admin/authors?locale=${locale}&success=saved`);
}

export async function archiveAuthorAction(formData: FormData) {
  await requireUser();
  const rawLocale = String(formData.get("locale") || "");
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const id = String(formData.get("id") || "");
  const previous = await prisma.author.findUnique({ where: { id }, select: { slug: true } });
  const archived = formData.get("intent") === "archive";
  try {
    if (!archived && formData.get("intent") !== "restore") throw new Error("無效的作者操作");
    await setAuthorArchived(prisma, id, archived);
  } catch (error) {
    redirect(`/admin/authors?locale=${locale}&error=${encodeURIComponent(error instanceof Error ? error.message : "作者更新失敗")}`);
  }
  revalidatePublicContent({ locale, authorSlugs: previous?.slug ? [previous.slug] : [] });
  await enqueuePublicInvalidation(prisma, { locale, authorSlugs: previous?.slug ? [previous.slug] : [] });
  redirect(`/admin/authors?locale=${locale}&success=${archived ? "archived" : "restored"}`);
}
