import { describe, expect, it, vi } from "vitest";

const { getCurrentUser, redirect, revalidatePath, revalidatePublicContent, enqueuePublicInvalidation, parseBrandSeoForm, validateStoredBrandAssets, db } = vi.hoisted(() => {
  const input = {
    siteName: "1Wiki",
    alternateName: null,
    assets: { icon48SourceUrl: null, logoSourceUrl: null, defaultOgSourceUrl: null },
    locales: {
      "zh-tw": { homeTitle: null, homeDescription: null, ogTitle: null, ogDescription: null },
      en: { homeTitle: null, homeDescription: null, ogTitle: null, ogDescription: null },
      ja: { homeTitle: null, homeDescription: null, ogTitle: null, ogDescription: null },
    },
  };
  const tx = { brandSeoSettings: { upsert: vi.fn() }, localeSeoSettings: { upsert: vi.fn() } };
  return {
    getCurrentUser: vi.fn(),
    redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
    revalidatePath: vi.fn(),
    revalidatePublicContent: vi.fn(),
    enqueuePublicInvalidation: vi.fn(),
    parseBrandSeoForm: vi.fn(() => input),
    validateStoredBrandAssets: vi.fn(),
    db: { $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) },
  };
});
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
vi.mock("@/lib/brand-seo/schema", () => ({ parseBrandSeoForm }));
vi.mock("@/lib/brand-seo/assets", () => ({ validateStoredBrandAssets }));
vi.mock("@/lib/content/public-invalidation", () => ({ revalidatePublicContent }));
vi.mock("@/lib/content/public-invalidation-outbox", () => ({ enqueuePublicInvalidation }));
import { saveBrandSeoAction } from "./actions";

describe("saveBrandSeoAction", () => {
  it("redirects an unauthenticated user before writing settings", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(saveBrandSeoAction(new FormData())).rejects.toThrow("redirect:/login");
  });

  it("invalidates every locale and queues one purge for shared brand assets", async () => {
    getCurrentUser.mockResolvedValue({ role: "OWNER", mustChangePassword: false });

    await expect(saveBrandSeoAction(new FormData())).rejects.toThrow("redirect:/admin/brand-seo?success=saved");

    expect(revalidatePath).toHaveBeenCalledWith("/admin/brand-seo");
    expect(revalidatePublicContent).toHaveBeenCalledWith(expect.objectContaining({
      locale: "zh-tw",
      extraPaths: ["/manifest.webmanifest", "/brand/icon-48.png", "/brand/logo", "/brand/og-default"],
    }));
    expect(revalidatePublicContent).toHaveBeenCalledWith({ locale: "en", extraPaths: undefined });
    expect(revalidatePublicContent).toHaveBeenCalledWith({ locale: "ja", extraPaths: undefined });
    expect(enqueuePublicInvalidation).toHaveBeenCalledTimes(3);
    expect(enqueuePublicInvalidation).toHaveBeenCalledWith(db, expect.objectContaining({ locale: "zh-tw" }));
  });
});
