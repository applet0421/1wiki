import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../../../tests/helpers/database";
import { saveAuthor, setAuthorArchived, listAuthors, getPublicAuthor } from "./authors";
import { savePost, getPublishedPostBySlug } from "./repository";

const input = { locale: "zh-tw" as const, name: "測試作者", slug: "test-author", contentHtml: '<p onclick="bad()">作者介紹</p><script>bad()</script>' };

describe("author library", () => {
  beforeEach(resetDatabase);

  it("sanitizes biographies and isolates authors by locale while allowing shared slugs", async () => {
    const zh = await saveAuthor(prisma, input);
    await saveAuthor(prisma, { ...input, locale: "en", name: "English author" });
    expect(zh.contentHtml).toBe("<p>作者介紹</p>");
    expect(await listAuthors(prisma, "zh-tw")).toHaveLength(1);
    expect(await getPublicAuthor(prisma, "ja", input.slug)).toBeNull();
    await expect(saveAuthor(prisma, input)).rejects.toThrow("網址代稱已被使用");
    await expect(saveAuthor(prisma, { ...input, id: zh.id, locale: "en" })).rejects.toThrow("語系不可變更");
    await saveAuthor(prisma, { ...input, id: zh.id, name: "新名字", contentHtml: "<p>新介紹</p>" });
    expect(await getPublicAuthor(prisma, "zh-tw", input.slug)).toMatchObject({ name: "新名字", contentHtml: "<p>新介紹</p>" });
  });

  it("preserves archived bylines, rejects new assignment and cross-language authors, and supports restoration", async () => {
    const user = await prisma.user.create({ data: { username: "editor", displayName: "帳號", passwordHash: "test" } });
    const category = await prisma.category.create({ data: { locale: "zh-tw", name: "AI", slug: "ai" } });
    const author = await saveAuthor(prisma, input);
    const en = await saveAuthor(prisma, { ...input, locale: "en" });
    const postInput = { locale: "zh-tw" as const, title: "文章", slug: "post", excerpt: "摘要", contentHtml: "<p>內容</p>", coverImage: "", status: "PUBLISHED" as const, categoryId: category.id, bylineId: author.id, seoTitle: "", seoDescription: "", seoKeywords: "", canonicalUrl: "" };
    const post = await savePost(prisma, user.id, postInput);
    await setAuthorArchived(prisma, author.id, true);
    await expect(savePost(prisma, user.id, { ...postInput, slug: "new" })).rejects.toThrow("已封存");
    await expect(savePost(prisma, user.id, { ...postInput, bylineId: en.id })).rejects.toThrow("語系必須與作者一致");
    await savePost(prisma, user.id, { ...postInput, id: post.id, title: "編輯既有文章" });
    expect(await getPublishedPostBySlug(prisma, "zh-tw", "post")).toMatchObject({ byline: { id: author.id, name: "測試作者" } });
    expect(await getPublicAuthor(prisma, "zh-tw", input.slug)).toMatchObject({ id: author.id });
    expect(await listAuthors(prisma, "zh-tw", "active")).toHaveLength(0);
    await setAuthorArchived(prisma, author.id, false);
    expect(await listAuthors(prisma, "zh-tw", "active")).toHaveLength(1);
    await expect(savePost(prisma, user.id, { ...postInput, slug: "restored" })).resolves.toMatchObject({ bylineId: author.id, authorId: user.id });
  });
});
