import { z } from "zod";

export const generatedArticleSchema = z.object({
  title: z.string().trim().min(1).max(180),
  contentHtml: z.string().trim().min(1),
  excerpt: z.string().trim().min(1).max(320),
  seoTitle: z.string().trim().min(1).max(70),
  seoDescription: z.string().trim().min(1).max(170),
  seoKeywords: z.string().trim().min(1).max(500),
});

export const articleJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "繁體中文文章標題" },
    contentHtml: { type: "string", description: "只含文章內容的安全 HTML" },
    excerpt: { type: "string", description: "不超過 160 字的繁體中文摘要" },
    seoTitle: { type: "string", description: "搜尋結果標題" },
    seoDescription: { type: "string", description: "搜尋結果說明" },
    seoKeywords: { type: "string", description: "逗號分隔關鍵字" },
  },
  required: ["title", "contentHtml", "excerpt", "seoTitle", "seoDescription", "seoKeywords"],
} as const;
