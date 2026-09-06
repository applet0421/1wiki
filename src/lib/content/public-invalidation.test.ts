import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { buildPublicInvalidationPaths } from "./public-invalidation";

describe("buildPublicInvalidationPaths", () => {
  it("invalidates affected article, categories, authors, homepages, and sitemap", () => {
    expect(buildPublicInvalidationPaths({
      locale: "zh-tw",
      articleSlugs: ["old-slug", "new-slug"],
      categoryPaths: ["ai", "software/chatgpt"],
      authorSlugs: ["alice"],
      pageSlugs: ["about"],
    })).toEqual(expect.arrayContaining([
      "/zh-tw",
      "/zh-tw/articles/old-slug",
      "/zh-tw/articles/new-slug",
      "/zh-tw/category/ai",
      "/zh-tw/category/software/chatgpt",
      "/zh-tw/authors/alice",
      "/zh-tw/about",
      "/sitemap.xml",
    ]));
  });

  it("deduplicates paths and keeps locales isolated", () => {
    expect(buildPublicInvalidationPaths({
      locale: "en",
      articleSlugs: ["same", "same"],
      categoryPaths: ["ai", "ai"],
      authorSlugs: ["writer", "writer"],
      pageSlugs: ["about", "about"],
    })).toEqual([
      "/en",
      "/en/articles/same",
      "/en/category/ai",
      "/en/authors/writer",
      "/en/about",
      "/sitemap.xml",
    ]);
  });

  it("marks a public path list as invalidation work", async () => {
    const { revalidatePublicContent } = await import("./public-invalidation");
    const { revalidatePath } = await import("next/cache");

    revalidatePublicContent({ locale: "ja", articleSlugs: ["guide"], pageSlugs: ["about"] });

    expect(revalidatePath).toHaveBeenCalledWith("/ja");
    expect(revalidatePath).toHaveBeenCalledWith("/ja/articles/guide");
    expect(revalidatePath).toHaveBeenCalledWith("/ja/about");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});
