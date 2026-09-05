import { z } from "zod";
import { supportedLocales } from "@/lib/i18n/config";

export const localeSchema = z.enum(supportedLocales);

const slugSchema = z
  .string()
  .trim()
  .min(1, "網址代稱不能空白")
  .max(160, "網址代稱不可超過 160 個字元")
  .regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u, "網址代稱格式不正確");

export const categoryInputSchema = z.object({
  locale: localeSchema,
  name: z.string().trim().min(1, "分類名稱不能空白").max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).default(""),
  parentId: z.string().cuid("請選擇有效的上層分類").nullable().default(null),
  showInNavigation: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const authorInputSchema = z.object({
  id: z.string().cuid().optional(),
  locale: localeSchema,
  name: z.string().trim().min(1, "作者名稱不能空白").max(100),
  slug: slugSchema,
  contentHtml: z.string().max(200000, "作者介紹過長").default(""),
});
export type AuthorInput = z.input<typeof authorInputSchema>;

export const postInputSchema = z.object({
  id: z.string().cuid().optional(),
  locale: localeSchema,
  title: z.string().trim().min(1, "標題不能空白").max(180),
  slug: slugSchema,
  excerpt: z.string().trim().max(320).default(""),
  contentHtml: z.string().default(""),
  coverImage: z.union([z.literal(""), z.url()]).default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  categoryId: z.string().cuid("請選擇有效分類"),
  bylineId: z.string().cuid("請選擇有效作者").nullable().optional(),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
  seoKeywords: z.string().trim().max(500).default(""),
  canonicalUrl: z.union([z.literal(""), z.url()]).default(""),
  aiContentType: z.enum(["TROUBLESHOOTING", "HOW_TO"]).optional(),
  primaryKeyword: z.string().trim().max(180).optional(),
  searchIntent: z.string().trim().max(500).optional(),
  aiSourceSupport: z.enum(["STRONG", "MEDIUM"]).optional(),
  aiNeedsVerification: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
});

export type PostInput = z.infer<typeof postInputSchema>;
export type CategoryInput = z.input<typeof categoryInputSchema>;
