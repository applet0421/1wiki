import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getR2Configuration } from "@/lib/media/r2";
import { executeLLMCall } from "./execute-llm";
import { parseStructuredJson } from "./errors";
import { resolveImageConfig } from "./image-config";
import { imageLanguage, imagePlanInputSchema, imagePlanSchema, isImageTarget, paragraphSchema } from "./image-jobs-schema";

export const imageJobViewSelect = {
  id: true, mimeType: true, status: true, prompt: true, alt: true, reason: true, targetId: true, paragraphs: true,
  publicUrl: true, width: true, height: true, error: true, model: true, imageSize: true, aspectRatio: true, altWarning: true,
} as const;

export async function planArticleImage(client: PrismaClient, userId: string, raw: unknown) {
  const input = imagePlanInputSchema.parse(raw);
  const config = resolveImageConfig();
  getR2Configuration();
  if (input.postId && !await client.post.findFirst({ where: { id: input.postId, locale: input.locale }, select: { id: true } })) throw new Error("找不到相同語言的文章");
  const job = await client.$transaction(async tx => {
    // Serialize per-user reservations; failed/planning attempts count too.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (await tx.imageGeneration.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86400000) } } }) >= 50) throw new Error("今日配圖方案已達 50 次上限，請稍後再試。");
    return tx.imageGeneration.create({ data: {
      userId, postId: input.postId, locale: input.locale, title: input.title, paragraphs: input.paragraphs,
      targetId: input.paragraphs.find(isImageTarget)!.id, prompt: "", alt: "", reason: "", status: "PLANNING",
      model: config.model, imageSize: config.imageSize, aspectRatio: config.aspectRatio, altModel: config.altModel,
    } });
  });
  try {
  const plan = await executeLLMCall({
    key: "IMAGE_PLAN", variables: { languageInstruction: imageLanguage(input.locale), title: input.title, paragraphs: JSON.stringify(input.paragraphs) },
    jsonSchema: { type: "object", properties: { targetId: { type: "string" }, prompt: { type: "string" }, alt: { type: "string" }, reason: { type: "string" } }, required: ["targetId", "prompt", "alt", "reason"], additionalProperties: false },
    schemaName: "image_plan", maxTokens: 2000,
    parse: (value) => parseStructuredJson(value, (v) => imagePlanSchema.parse(v)),
  }, { client });
  if (!input.paragraphs.some(p => p.id === plan.targetId && isImageTarget(p))) throw new Error("AI 未選擇有效的正文段落，請重新分析。");
  return await client.imageGeneration.update({ where: { id: job.id }, data: { ...plan, status: "PLANNED" }, select: imageJobViewSelect });
  } catch (error) {
    await client.imageGeneration.update({ where: { id: job.id }, data: { status: "FAILED", error: "配圖分析未完成，請重新分析。" } });
    throw error;
  }
}

export async function queueArticleImage(client: PrismaClient, userId: string, id: string, action: { action: "generate"; prompt: string; alt: string; targetId: string } | { action: "retry-upload" }) {
  const job = await client.imageGeneration.findFirst({ where: { id, userId }, select: { status: true, paragraphs: true, mimeType: true } });
  if (!job) throw new Error("找不到配圖任務");
  if (action.action === "generate") {
    const paragraphs = z.array(paragraphSchema).parse(job.paragraphs);
    if (!paragraphs.some(p => p.id === action.targetId && isImageTarget(p))) throw new Error("請選擇有效的正文段落");
    resolveImageConfig(); getR2Configuration();
    // Compare-and-set prevents double clicks and replayed requests from generating twice.
    await client.imageGeneration.updateMany({ where: { id, userId, status: "PLANNED" }, data: { prompt: action.prompt, alt: action.alt, targetId: action.targetId, status: "QUEUED", error: null } });
  } else {
    if (!job.mimeType) throw new Error("尚無可重試上傳的圖片，請重新建立配圖方案。");
    await client.imageGeneration.updateMany({ where: { id, userId, status: "FAILED", imageBytes: { not: null } }, data: { status: "GENERATED", error: null, leaseExpiresAt: null } });
  }
  return client.imageGeneration.findFirstOrThrow({ where: { id, userId }, select: imageJobViewSelect });
}
