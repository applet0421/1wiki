"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { supportedLocales } from "@/lib/i18n/config";
import { ARTICLE_AD_SETTING_ID, hasArticleAdSettingsModel, validateArticleAdSettings } from "@/lib/adsense/article-ad-settings";

function asNumber(formData: FormData, field: string) {
  return Number(formData.get(field));
}

export async function saveArticleAdSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "OWNER") redirect("/admin");
  if (!hasArticleAdSettingsModel(prisma)) redirect(`/admin/ads?error=${encodeURIComponent("廣告設定尚未就緒；請先完成資料庫 migration 並重啟開發伺服器")}`);

  try {
    const settings = validateArticleAdSettings({
      middleAdInterval: asNumber(formData, "middleAdInterval"),
      maxMiddleAds: asNumber(formData, "maxMiddleAds"),
    });
    await prisma.articleAdSetting.upsert({
      where: { id: ARTICLE_AD_SETTING_ID },
      create: { id: ARTICLE_AD_SETTING_ID, ...settings },
      update: settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "文章廣告設定儲存失敗";
    redirect(`/admin/ads?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/ads");
  for (const locale of supportedLocales) revalidatePath(`/${locale}`, "layout");
  redirect("/admin/ads?success=saved");
}
