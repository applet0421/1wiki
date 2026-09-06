import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { deleteSitePage, getPublishedCategoryPages, getPublishedSitePage, listAdminSitePages, saveSitePage } from "./pages";

describe("site page repository", () => {
  beforeEach(resetDatabase);

  const input = (overrides: Record<string, unknown> = {}) => ({
    locale: "zh-tw" as const,
    title: "關於 1Wiki",
    slug: "about",
    excerpt: "認識 1Wiki。",
    contentHtml: "<p>內容</p>",
    status: "DRAFT" as const,
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    canonicalUrl: "",
    ...overrides,
  });

  it("saves sanitized localized pages and lists them for the admin", async () => {
    const page = await saveSitePage(prisma, input({ contentHtml: '<p>安全</p><script>alert(1)</script>' }));

    expect(page.contentHtml).toBe("<p>安全</p>");
    await expect(listAdminSitePages(prisma, "zh-tw")).resolves.toMatchObject([{ id: page.id, slug: "about" }]);
  });

  it("allows the same slug in another locale but rejects a duplicate in one locale", async () => {
    await saveSitePage(prisma, input());
    await expect(saveSitePage(prisma, input())).rejects.toThrow("網址代稱已被使用");
    await expect(saveSitePage(prisma, input({ locale: "en", title: "About" }))).resolves.toMatchObject({ locale: "en" });
  });

  it("only returns published pages and preserves the first publish time", async () => {
    const draft = await saveSitePage(prisma, input());
    await expect(getPublishedSitePage(prisma, "zh-tw", "about")).resolves.toBeNull();
    const publishedAt = new Date("2026-09-06T01:00:00.000Z");
    const published = await saveSitePage(prisma, input({ id: draft.id, status: "PUBLISHED" }), publishedAt);
    const draftAgain = await saveSitePage(prisma, input({ id: draft.id, status: "DRAFT" }), new Date("2026-09-06T02:00:00.000Z"));

    expect(published.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    expect(draftAgain.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    await expect(getPublishedSitePage(prisma, "zh-tw", "about")).resolves.toMatchObject({ id: draft.id, status: "PUBLISHED" });
  });

  it("deletes a page", async () => {
    const page = await saveSitePage(prisma, input());
    await expect(deleteSitePage(prisma, page.id)).resolves.toMatchObject({ id: page.id });
    await expect(getPublishedSitePage(prisma, "zh-tw", "about")).resolves.toBeNull();
  });

  it("allows an optional same-locale category mount and lists only published mounted pages", async () => {
    const category = await prisma.category.create({ data: { locale: "zh-tw", name: "AI", slug: "ai" } });
    const mounted = await saveSitePage(prisma, input({ categoryId: category.id, status: "PUBLISHED" }));
    await saveSitePage(prisma, input({ title: "未發布", slug: "draft", categoryId: category.id }));
    await expect(getPublishedCategoryPages(prisma, "zh-tw", category.id)).resolves.toMatchObject([{ id: mounted.id, categoryId: category.id }]);
    await expect(saveSitePage(prisma, input({ locale: "en", title: "About", slug: "about", categoryId: category.id }))).rejects.toThrow("分類語系必須與頁面一致");
  });
});
