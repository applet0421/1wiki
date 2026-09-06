import { Prisma, type PrismaClient } from "@prisma/client";
import { localeSchema } from "./schema";
import type { Locale } from "@/lib/i18n/config";
import { sanitizeArticleHtml } from "./sanitize";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type SitePageInput = {
  id?: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml?: string;
  status: "DRAFT" | "PUBLISHED";
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
};

function nullable(value = ""): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function validateInput(input: SitePageInput) {
  const locale = localeSchema.parse(input.locale);
  const title = input.title.trim();
  const slug = input.slug.trim();
  if (!title) throw new Error("標題不能空白");
  if (!slug || !/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(slug)) throw new Error("網址代稱格式不正確");
  if (slug.length > 160) throw new Error("網址代稱不可超過 160 個字元");
  const excerpt = (input.excerpt || "").trim();
  if (excerpt.length > 320) throw new Error("摘要不可超過 320 個字元");
  if (input.status === "PUBLISHED" && !excerpt) throw new Error("摘要不能空白");
  if (input.status === "PUBLISHED" && !sanitizeArticleHtml(input.contentHtml || "").trim()) throw new Error("內容不能空白");
  return { locale, title, slug, excerpt, contentHtml: sanitizeArticleHtml(input.contentHtml || ""), status: input.status,
    seoTitle: nullable(input.seoTitle), seoDescription: nullable(input.seoDescription), seoKeywords: nullable(input.seoKeywords), canonicalUrl: nullable(input.canonicalUrl) };
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("網址代稱已被使用");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new Error("找不到指定資料");
  throw error;
}

export async function saveSitePage(client: PrismaClient, rawInput: SitePageInput, now = new Date()) {
  const input = validateInput(rawInput);
  try {
    if (!rawInput.id) {
      return await client.sitePage.create({ data: { ...input, publishedAt: input.status === "PUBLISHED" ? now : null } });
    }
    const current = await client.sitePage.findUnique({ where: { id: rawInput.id } });
    if (!current) throw new Error("找不到指定資料");
    return await client.sitePage.update({ where: { id: rawInput.id }, data: { ...input, publishedAt: input.status === "PUBLISHED" && !current.publishedAt ? now : current.publishedAt } });
  } catch (error) {
    mapPrismaError(error);
  }
}

export function listAdminSitePages(client: DatabaseClient, locale?: Locale) {
  return client.sitePage.findMany({ where: locale ? { locale } : undefined, orderBy: [{ locale: "asc" }, { updatedAt: "desc" }] });
}

export function getSitePage(client: DatabaseClient, id: string) {
  return client.sitePage.findUnique({ where: { id } });
}

export function getPublishedSitePage(client: DatabaseClient, locale: Locale, slug: string) {
  return client.sitePage.findFirst({ where: { locale, slug, status: "PUBLISHED", publishedAt: { lte: new Date() } } });
}

export async function deleteSitePage(client: PrismaClient, id: string) {
  try {
    return await client.sitePage.delete({ where: { id } });
  } catch (error) {
    mapPrismaError(error);
  }
}
