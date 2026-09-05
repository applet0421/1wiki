import { z } from "zod";

export const paragraphSchema = z.object({
  id: z.string().min(1).max(120),
  tag: z.enum(["p", "h2", "h3", "ul", "ol", "blockquote", "div", "pre"]),
  text: z.string().trim().min(1).max(20000),
});
export type ImageParagraph = z.infer<typeof paragraphSchema>;
export const imagePlanInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  locale: z.enum(["zh-tw", "en", "ja"]),
  postId: z.string().min(1).max(128).optional(),
  paragraphs: z.array(paragraphSchema).min(1).max(300),
}).refine((v) => new Set(v.paragraphs.map(p => p.id)).size === v.paragraphs.length, "段落識別重複")
  .refine((v) => v.paragraphs.reduce((n, p) => n + p.text.length, 0) <= 100000, "正文過長")
  .refine((v) => v.paragraphs.some(isImageTarget), "請先新增正文段落");
export const imagePlanSchema = z.object({
  targetId: z.string().min(1).max(120),
  prompt: z.string().trim().min(1).max(6000),
  alt: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(500),
});
export const imageJobActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), prompt: z.string().trim().min(1).max(6000), alt: z.string().trim().min(1).max(500), targetId: z.string().min(1).max(120) }),
  z.object({ action: z.literal("retry-upload") }),
]);
export function isImageTarget(p: { tag: string }) { return ["p", "ul", "ol", "blockquote", "div", "pre"].includes(p.tag); }
export function imageLanguage(locale: string) { return locale === "ja" ? "請使用日文。" : locale === "en" ? "Use English." : "請使用繁體中文。"; }
