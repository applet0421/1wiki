import type { ImageGeneration, PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { uploadGeneratedImage } from "@/lib/media/r2";
import { generateImage } from "./providers/gemini-image";
import { resolveImageConfig } from "./image-config";
import { getActivePrompt } from "./prompt-repository";
import { renderPromptTemplate } from "./prompt-template";
import { findEffectivePrice, recordLLMUsage } from "./usage-repository";
import type { PromptKey } from "./prompt-definitions";
import type { NormalizedTokenUsage } from "./types";

const leaseMs = 240000;
const emptyUsage: NormalizedTokenUsage = { inputTokens: null, outputTokens: null, totalTokens: null };
type Dependencies = { generate?: typeof generateImage; upload?: typeof uploadGeneratedImage };

async function auditedCall<T extends { usage: NormalizedTokenUsage }>(client: PrismaClient, key: PromptKey, model: string, variables: Record<string, string>, call: (prompt: string) => Promise<T>) {
  const prompt = await getActivePrompt(client, key);
  const text = `${renderPromptTemplate(prompt.systemTemplate, variables)}\n${renderPromptTemplate(prompt.userTemplate, variables)}`;
  const startedAt = new Date();
  const price = await findEffectivePrice(client, "gemini", model, startedAt);
  const audit = async (status: "SUCCESS" | "FAILURE", usage: NormalizedTokenUsage, error?: unknown) => {
    try { await recordLLMUsage(client, { promptDefinitionId: prompt.definitionId, promptVersionId: prompt.versionId, provider: "gemini", model, status, usage, durationMs: Date.now() - startedAt.getTime(), price, startedAt, error }); }
    catch { console.error("AI image usage audit could not be saved"); }
  };
  try { const value = await call(text); await audit("SUCCESS", value.usage); return value; }
  catch (error) { await audit("FAILURE", (error as { usage?: NormalizedTokenUsage })?.usage ?? emptyUsage, error); throw error; }
}

export async function recoverImageJobs(client: PrismaClient, now = new Date()) {
  // A killed generation may already have been billed; never automatically submit it again.
  await client.imageGeneration.updateMany({ where: { status: "GENERATING", leaseExpiresAt: { lt: now } }, data: { status: "UNKNOWN", error: "生成作業中斷，結果與費用尚未確認；系統不會自動重新生圖。", leaseExpiresAt: null } });
  await client.imageGeneration.updateMany({ where: { status: "UPLOADING", leaseExpiresAt: { lt: now }, imageBytes: { not: null } }, data: { status: "GENERATED", leaseExpiresAt: null } });
}

async function uploadJob(client: PrismaClient, job: ImageGeneration, dependencies: Dependencies) {
  const lease = new Date(Date.now() + leaseMs);
  const claimed = await client.imageGeneration.updateMany({ where: { id: job.id, status: "GENERATED" }, data: { status: "UPLOADING", leaseExpiresAt: lease } });
  if (!claimed.count) return;
  try {
    if (!job.imageBytes) throw new Error("missing image");
    const converted = await sharp(Buffer.from(job.imageBytes), { limitInputPixels: 40000000, failOn: "error" }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
    const key = `ai-images/${job.id}.webp`;
    const publicUrl = await (dependencies.upload ?? uploadGeneratedImage)(key, converted.data, "image/webp");
    // IMAGE_PLAN already creates the article-aware alt text. Keep it unchanged so
    // the image flow makes only one AI call and does not replace the SEO draft
    // with a second vision-model guess.
    await client.imageGeneration.updateMany({ where: { id: job.id, status: "UPLOADING", leaseExpiresAt: lease }, data: { status: "READY", publicUrl, objectKey: key, width: converted.info.width, height: converted.info.height, mimeType: "image/webp", imageBytes: null, altWarning: null, error: null, leaseExpiresAt: null } });
  } catch {
    await client.imageGeneration.updateMany({ where: { id: job.id, status: "UPLOADING", leaseExpiresAt: lease }, data: { status: "FAILED", error: "圖片處理或上傳失敗，原圖已保留，可重試上傳。", leaseExpiresAt: null } });
  }
}

export async function processNextImageJob(client: PrismaClient, dependencies: Dependencies = {}): Promise<boolean> {
  const job = await client.imageGeneration.findFirst({ where: { status: { in: ["QUEUED", "GENERATED"] } }, orderBy: { createdAt: "asc" } });
  if (!job) return false;
  if (job.status === "GENERATED") { await uploadJob(client, job, dependencies); return true; }
  const lease = new Date(Date.now() + leaseMs);
  const claimed = await client.imageGeneration.updateMany({ where: { id: job.id, status: "QUEUED" }, data: { status: "GENERATING", leaseExpiresAt: lease } });
  if (!claimed.count) return false;
  try {
    const user = await client.user.findUnique({ where: { id: job.userId }, select: { isActive: true, mustChangePassword: true } });
    if (!user?.isActive || user.mustChangePassword) throw new Error("帳戶目前無法執行配圖。");
    const config = resolveImageConfig({ ...process.env, GEMINI_IMAGE_MODEL: job.model, GEMINI_IMAGE_SIZE: job.imageSize, GEMINI_IMAGE_ASPECT_RATIO: job.aspectRatio, GEMINI_IMAGE_ALT_MODEL: job.altModel });
    await auditedCall(client, "IMAGE_GENERATE", job.model, { prompt: job.prompt }, async prompt => {
      const result = await (dependencies.generate ?? generateImage)({ config, prompt });
      // Persist bytes before any R2 operation, so upload retries never need another paid generation.
      try {
        const saved = await client.imageGeneration.updateMany({ where: { id: job.id, status: "GENERATING", leaseExpiresAt: lease }, data: { imageBytes: new Uint8Array(result.bytes), mimeType: result.mimeType, status: "GENERATED", leaseExpiresAt: null, error: null } });
        if (!saved.count) throw new Error("generation lease lost");
      } catch {
        throw Object.assign(new Error("圖片已生成，但保存結果未確認；請查核用量，勿直接重複生圖。"), { generationStatusUnknown: true, usage: result.usage });
      }
      return result;
    });
  } catch (error) {
    const unknown = !!(error as { generationStatusUnknown?: boolean })?.generationStatusUnknown;
    const message = unknown ? "生成結果與費用尚未確認，系統不會自動重生。請稍後查核用量，再決定是否重新建立方案。" : "圖片生成未完成，請檢查模型設定、服務額度或調整配圖方案。";
    await client.imageGeneration.updateMany({ where: { id: job.id, status: "GENERATING", leaseExpiresAt: lease }, data: { status: unknown ? "UNKNOWN" : "FAILED", error: message, leaseExpiresAt: null } });
  }
  return true;
}
