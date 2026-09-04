import { z } from "zod";

export const generatedArticleSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  contentHtml: z.string().trim().min(1),
  excerpt: z.string().trim().min(1).max(320),
  seoTitle: z.string().trim().min(1).max(70),
  seoDescription: z.string().trim().min(1).max(170),
  seoKeywords: z.string().trim().min(1).max(500),
});

export const contentIdeaSchema = z.object({
  type: z.enum(["TROUBLESHOOTING", "HOW_TO"]),
  title: z.string().trim().min(1).max(180),
  primaryKeyword: z.string().trim().min(1).max(180),
  searchIntent: z.string().trim().min(1).max(500),
  support: z.enum(["STRONG", "MEDIUM"]),
});

const analyzedContentIdeaSchema = contentIdeaSchema.extend({ support: z.enum(["STRONG", "MEDIUM", "WEAK"]) });

export const contentIdeasResponseSchema = z.object({
  ideas: z.array(analyzedContentIdeaSchema).max(20),
});

export const generatedContentDraftSchema = generatedArticleSchema.extend({
  categoryId: z.string().trim().min(1),
  needsVerification: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const articleJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "繁體中文文章標題" },
    slug: { type: "string", description: "英文小寫 kebab-case 網址代稱" },
    contentHtml: { type: "string", description: "只含文章內容的安全 HTML" },
    excerpt: { type: "string", description: "不超過 160 字的繁體中文摘要" },
    seoTitle: { type: "string", description: "搜尋結果標題" },
    seoDescription: { type: "string", description: "搜尋結果說明" },
    seoKeywords: { type: "string", description: "逗號分隔關鍵字" },
  },
  required: ["title", "slug", "contentHtml", "excerpt", "seoTitle", "seoDescription", "seoKeywords"],
} as const;

export const contentIdeasJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["TROUBLESHOOTING", "HOW_TO"] },
          title: { type: "string" },
          primaryKeyword: { type: "string" },
          searchIntent: { type: "string" },
          support: { type: "string", enum: ["STRONG", "MEDIUM", "WEAK"] },
        },
        required: ["type", "title", "primaryKeyword", "searchIntent", "support"],
      },
    },
  },
  required: ["ideas"],
} as const;

export const generatedContentDraftJsonSchema = {
  ...articleJsonSchema,
  properties: {
    ...articleJsonSchema.properties,
    categoryId: { type: "string", description: "必須是提供的現有分類 ID" },
    needsVerification: { type: "array", items: { type: "string" }, maxItems: 20 },
  },
  required: [...articleJsonSchema.required, "categoryId", "needsVerification"],
} as const;
