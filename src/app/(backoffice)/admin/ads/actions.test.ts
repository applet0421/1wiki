import { describe, expect, it, vi } from "vitest";

const { getCurrentUser, upsert, revalidatePath, redirect, enqueuePublicInvalidation, db } = vi.hoisted(() => {
  const upsert = vi.fn();
  return {
    getCurrentUser: vi.fn(),
    upsert,
    revalidatePath: vi.fn(),
    enqueuePublicInvalidation: vi.fn(),
    redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
    db: { articleAdSetting: { upsert } },
  };
});

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/content/public-invalidation-outbox", () => ({ enqueuePublicInvalidation }));

import { saveArticleAdSettingsAction } from "./actions";

describe("saveArticleAdSettingsAction", () => {
  it("redirects an unauthenticated user before writing settings", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(saveArticleAdSettingsAction(new FormData())).rejects.toThrow("redirect:/login");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("asks for a server restart instead of exposing a stale Prisma-client error", async () => {
    getCurrentUser.mockResolvedValue({ role: "OWNER", mustChangePassword: false });
    const original = db.articleAdSetting;
    delete (db as { articleAdSetting?: unknown }).articleAdSetting;
    await expect(saveArticleAdSettingsAction(new FormData())).rejects.toThrow("redirect:/admin/ads?error=%E5%BB%A3%E5%91%8A%E8%A8%AD%E5%AE%9A%E5%B0%9A%E6%9C%AA%E5%B0%B1%E7%B7%92%EF%BC%9B%E8%AB%8B%E5%85%88%E5%AE%8C%E6%88%90%E8%B3%87%E6%96%99%E5%BA%AB%20migration%20%E4%B8%A6%E9%87%8D%E5%95%9F%E9%96%8B%E7%99%BC%E4%BC%BA%E6%9C%8D%E5%99%A8");
    db.articleAdSetting = original;
  });

  it("saves owner settings and invalidates public locale layouts and edge-cache entries", async () => {
    getCurrentUser.mockResolvedValue({ role: "OWNER", mustChangePassword: false });
    const form = new FormData();
    form.set("middleAdInterval", "2");
    form.set("maxMiddleAds", "3");
    form.set("categoryInlineAdInterval", "8");
    form.set("anchorAdsEnabled", "on");
    form.set("anchorAdsOnArticles", "on");
    form.set("anchorAdsOnHome", "on");

    await expect(saveArticleAdSettingsAction(form)).rejects.toThrow("redirect:/admin/ads?success=saved");
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 8, anchorAdsEnabled: true, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: false },
      update: { middleAdInterval: 2, maxMiddleAds: 3, categoryInlineAdInterval: 8, anchorAdsEnabled: true, anchorAdsOnArticles: true, anchorAdsOnHome: true, anchorAdsOnCategories: false },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/zh-tw", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/en", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/ja", "layout");
    expect(enqueuePublicInvalidation).toHaveBeenCalledTimes(3);
    expect(enqueuePublicInvalidation).toHaveBeenCalledWith(db, { locale: "zh-tw" });
    expect(enqueuePublicInvalidation).toHaveBeenCalledWith(db, { locale: "en" });
    expect(enqueuePublicInvalidation).toHaveBeenCalledWith(db, { locale: "ja" });
  });
});
