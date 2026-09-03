import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "網址代稱不能空白")
  .max(160, "網址代稱不可超過 160 個字元")
  .regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u, "網址代稱格式不正確");

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "分類名稱不能空白").max(80),
  slug: slugSchema,
  description: z.string().trim().max(300).default(""),
});

export const postInputSchema = z.object({
  id: z.string().cuid().optional(),
  title: z.string().trim().min(1, "標題不能空白").max(180),
  slug: slugSchema,
  excerpt: z.string().trim().max(320).default(""),
  contentHtml: z.string().default(""),
  coverImage: z.union([z.literal(""), z.url()]).default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  categoryId: z.string().cuid("請選擇有效分類"),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(170).default(""),
  seoKeywords: z.string().trim().max(500).default(""),
  canonicalUrl: z.union([z.literal(""), z.url()]).default(""),
});

export type PostInput = z.infer<typeof postInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
