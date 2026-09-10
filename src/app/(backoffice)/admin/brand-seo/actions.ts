"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { defaultLocale, supportedLocales } from "@/lib/i18n/config";
import { parseBrandSeoForm } from "@/lib/brand-seo/schema";
import { validateStoredBrandAssets } from "@/lib/brand-seo/assets";
import { BRAND_SEO_SETTINGS_ID } from "@/lib/brand-seo/constants";
import { brandSeoSharedPublicPaths } from "@/lib/brand-seo/invalidation";
import { enqueuePublicInvalidation } from "@/lib/content/public-invalidation-outbox";
import { revalidatePublicContent } from "@/lib/content/public-invalidation";

function field(formData: FormData, name: string) { return String(formData.get(name) || ""); }

function payload(formData: FormData) {
  return {
    siteName: field(formData, "siteName"), alternateName: field(formData, "alternateName"),
    assets: { icon48SourceUrl: field(formData, "icon48SourceUrl"), logoSourceUrl: field(formData, "logoSourceUrl"), defaultOgSourceUrl: field(formData, "defaultOgSourceUrl") },
    locales: Object.fromEntries(supportedLocales.map((locale) => [locale, {
      homeTitle: field(formData, `${locale}.homeTitle`), homeDescription: field(formData, `${locale}.homeDescription`),
      ogTitle: field(formData, `${locale}.ogTitle`), ogDescription: field(formData, `${locale}.ogDescription`),
    }])),
  };
}

export async function saveBrandSeoAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "OWNER") redirect("/admin");
  try {
    const input = parseBrandSeoForm(payload(formData));
    await validateStoredBrandAssets(input.assets);
    await prisma.$transaction(async (tx) => {
      await tx.brandSeoSettings.upsert({
        where: { id: BRAND_SEO_SETTINGS_ID },
        create: { id: BRAND_SEO_SETTINGS_ID, siteName: input.siteName, alternateName: input.alternateName, ...input.assets },
        update: { siteName: input.siteName, alternateName: input.alternateName, ...input.assets },
      });
      await Promise.all(supportedLocales.map((locale) => tx.localeSeoSettings.upsert({
        where: { locale }, create: { locale, ...input.locales[locale] }, update: input.locales[locale],
      })));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "品牌設定儲存失敗";
    redirect(`/admin/brand-seo?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/brand-seo");
  await Promise.all(supportedLocales.map((locale) => {
    const input = { locale, extraPaths: locale === defaultLocale ? brandSeoSharedPublicPaths() : undefined };
    revalidatePublicContent(input);
    return enqueuePublicInvalidation(prisma, input);
  }));
  redirect("/admin/brand-seo?success=saved");
}
