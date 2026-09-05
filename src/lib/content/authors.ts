import { Prisma, type PrismaClient } from "@prisma/client";
import { authorInputSchema, type AuthorInput } from "./schema";
import { sanitizeArticleHtml } from "./sanitize";
import type { Locale } from "@/lib/i18n/config";

export type AuthorOption = { id: string; locale: string; name: string; archivedAt: Date | null };
export type AuthorStatus = "all" | "active" | "archived";

export async function saveAuthor(client: PrismaClient, rawInput: AuthorInput) {
  const { id, ...input } = authorInputSchema.parse(rawInput);
  const data = { ...input, contentHtml: sanitizeArticleHtml(input.contentHtml) };
  try {
    if (id) {
      const current = await client.author.findUnique({ where: { id } });
      if (!current) throw new Error("找不到指定作者");
      if (current.locale !== input.locale) throw new Error("作者語系不可變更");
      return await client.author.update({ where: { id }, data });
    }
    return await client.author.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("此語系的作者網址代稱已被使用");
    }
    throw error;
  }
}

export async function setAuthorArchived(client: PrismaClient, id: string, archived: boolean) {
  const current = await client.author.findUnique({ where: { id } });
  if (!current) throw new Error("找不到指定作者");
  return client.author.update({ where: { id }, data: { archivedAt: archived ? current.archivedAt ?? new Date() : null } });
}

export function listAuthors(client: PrismaClient, locale?: Locale, status: AuthorStatus = "all") {
  return client.author.findMany({
    where: { ...(locale ? { locale } : {}), ...(status === "active" ? { archivedAt: null } : status === "archived" ? { archivedAt: { not: null } } : {}) },
    include: { _count: { select: { posts: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export function listAuthorOptions(client: PrismaClient) {
  return client.author.findMany({ select: { id: true, locale: true, name: true, archivedAt: true }, orderBy: { name: "asc" } });
}

export function getPublicAuthor(client: PrismaClient, locale: Locale, slug: string) {
  // Archiving prevents new assignment; existing public byline links remain valid.
  return client.author.findUnique({ where: { locale_slug: { locale, slug } } });
}
