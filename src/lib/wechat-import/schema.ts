import { z } from "zod";
import type { ArticleBlock, WeChatRewriteDraft } from "./types";

const blockId = z.string().regex(/^b-\d{4,}$/u, "區塊 ID 格式不正確");
const articleBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: blockId, type: z.literal("text"), html: z.string().trim().min(1).max(200_000) }).strict(),
  z.object({ id: blockId, type: z.literal("image"), assetId: z.string().min(1).max(128), alt: z.string().trim().max(500) }).strict(),
]);

const slugSchema = z.string().trim().min(1).max(160).regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u, "網址代稱格式不正確");

const rewriteDraftSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: slugSchema,
  excerpt: z.string().trim().max(320),
  blocks: z.array(articleBlockSchema).min(1).max(1000),
  seoTitle: z.string().trim().min(1).max(70),
  seoDescription: z.string().trim().min(1).max(170),
  seoKeywords: z.string().trim().max(500),
  needsVerification: z.array(z.string().trim().min(1).max(500)).max(20),
}).strict();

export function parseStoredBlocks(value: unknown): ArticleBlock[] {
  return z.array(articleBlockSchema).min(1).max(1000).parse(value);
}

export function parseRewriteDraft(value: unknown): WeChatRewriteDraft {
  return rewriteDraftSchema.parse(value);
}
