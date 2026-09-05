import sharp from "sharp";
import { AIProviderError, errorForStatus, parseStructuredJson } from "../errors";
import type { ImageConfig } from "../image-config";
import { normalizeGeminiUsage } from "../provider-usage";
import type { NormalizedTokenUsage } from "../types";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 30 * 1024 * 1024;
type ImageUsage = NormalizedTokenUsage & { imageOutputTokens: number | null };
type Part = { thought?: boolean; text?: string; inlineData?: { mimeType?: string; data?: string } };
type ResponseData = { candidates?: Array<{ content?: { parts?: Part[] } }>; usageMetadata?: Record<string, unknown> };
type Request = { config: ImageConfig; prompt: string; fetcher?: typeof fetch };

const imageSizeEnum: Record<ImageConfig["imageSize"], string> = {
  "512": "IMAGE_SIZE_FIVE_TWELVE",
  "1K": "IMAGE_SIZE_ONE_K",
  "2K": "IMAGE_SIZE_TWO_K",
  "4K": "IMAGE_SIZE_FOUR_K",
};
const aspectRatioEnum: Record<ImageConfig["aspectRatio"], string> = {
  "1:1": "ASPECT_RATIO_ONE_BY_ONE", "1:4": "ASPECT_RATIO_ONE_BY_FOUR", "1:8": "ASPECT_RATIO_ONE_BY_EIGHT",
  "2:3": "ASPECT_RATIO_TWO_BY_THREE", "3:2": "ASPECT_RATIO_THREE_BY_TWO", "3:4": "ASPECT_RATIO_THREE_BY_FOUR",
  "4:1": "ASPECT_RATIO_FOUR_BY_ONE", "4:3": "ASPECT_RATIO_FOUR_BY_THREE", "4:5": "ASPECT_RATIO_FOUR_BY_FIVE",
  "5:4": "ASPECT_RATIO_FIVE_BY_FOUR", "8:1": "ASPECT_RATIO_EIGHT_BY_ONE", "9:16": "ASPECT_RATIO_NINE_BY_SIXTEEN",
  "16:9": "ASPECT_RATIO_SIXTEEN_BY_NINE", "21:9": "ASPECT_RATIO_TWENTY_ONE_BY_NINE",
};

function normalizeUsage(raw?: Record<string, unknown>): ImageUsage {
  const usage = normalizeGeminiUsage(raw);
  const thinking = typeof raw?.thoughtsTokenCount === "number" && Number.isInteger(raw.thoughtsTokenCount) && raw.thoughtsTokenCount >= 0 ? raw.thoughtsTokenCount : 0;
  if (usage.outputTokens !== null) usage.outputTokens += thinking;
  if (typeof raw?.totalTokenCount !== "number" && usage.inputTokens !== null && usage.outputTokens !== null) usage.totalTokens = usage.inputTokens + usage.outputTokens;
  const details = Array.isArray(raw?.candidatesTokensDetails) ? raw.candidatesTokensDetails : [];
  const images = details.filter((item) => item?.modality === "IMAGE" && Number.isInteger(item.tokenCount) && item.tokenCount >= 0);
  return { ...usage, imageOutputTokens: images.length ? images.reduce((sum, item) => sum + item.tokenCount, 0) : null };
}

async function request(config: ImageConfig, model: string, body: unknown, fetcher: typeof fetch, generating: boolean): Promise<ResponseData> {
  try {
    const response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(generating ? 120_000 : 60_000),
    });
    if (!response.ok) throw errorForStatus(response.status);
    if (!response.body) throw new AIProviderError("invalid_output");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new AIProviderError("output_limit"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!parsed || typeof parsed !== "object") throw new Error();
      return parsed as ResponseData;
    } catch { throw new AIProviderError("invalid_output"); }
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw Object.assign(new AIProviderError(timeout ? "timeout" : "upstream"), { generationStatusUnknown: generating });
  }
}

async function validateImage(bytes: Buffer, mimeType: string): Promise<void> {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new AIProviderError("output_limit");
  const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[mimeType];
  if (!expected) throw new AIProviderError("invalid_output");
  try {
    const decoder = sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 });
    const metadata = await decoder.metadata();
    if (metadata.format !== expected || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error();
    await decoder.stats();
  } catch { throw new AIProviderError("invalid_output"); }
}

export async function generateImage({ config, prompt, fetcher = fetch }: Request): Promise<{ bytes: Buffer; mimeType: string; usage: ImageUsage; rawUsage?: unknown }> {
  const result = await request(config, config.model, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], responseFormat: { image: { imageSize: imageSizeEnum[config.imageSize], aspectRatio: aspectRatioEnum[config.aspectRatio] } } },
  }, fetcher, true);
  const usage = normalizeUsage(result.usageMetadata);
  try {
    const parts = (result.candidates ?? []).flatMap((candidate) => candidate.content?.parts ?? []).filter((part) => !part.thought && part.inlineData);
    if (parts.length !== 1) throw new AIProviderError("invalid_output");
    const { data, mimeType } = parts[0].inlineData!;
    if (typeof data !== "string" || !data.length || typeof mimeType !== "string") throw new AIProviderError("invalid_output");
    if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new AIProviderError("output_limit");
    if (data.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(data)) throw new AIProviderError("invalid_output");
    const bytes = Buffer.from(data, "base64");
    if (bytes.toString("base64") !== data) throw new AIProviderError("invalid_output");
    await validateImage(bytes, mimeType);
    return { bytes, mimeType, usage, rawUsage: result.usageMetadata };
  } catch (error) {
    throw Object.assign(error instanceof AIProviderError ? error : new AIProviderError("invalid_output"), { usage });
  }
}

export async function analyzeImageAlt({ config, prompt, bytes, mimeType, fetcher = fetch }: Request & { bytes: Buffer; mimeType: string }): Promise<{ alt: string; usage: NormalizedTokenUsage }> {
  await validateImage(bytes, mimeType);
  const result = await request(config, config.altModel, {
    contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: bytes.toString("base64") } }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { alt: { type: "STRING" } }, required: ["alt"] } },
  }, fetcher, false);
  // This request asks for JSON text only; no output image tokens can be billed.
  const usage = { ...normalizeUsage(result.usageMetadata), imageOutputTokens: 0 };
  try {
    const text = result.candidates?.[0]?.content?.parts?.filter((part) => !part.thought && typeof part.text === "string").map((part) => part.text).join("");
    const alt = parseStructuredJson(text, (value) => {
      if (!value || typeof value !== "object" || !("alt" in value) || typeof value.alt !== "string" || !value.alt.trim() || value.alt.trim().length > 500) throw new Error();
      return value.alt.trim();
    });
    return { alt, usage };
  } catch (error) { throw Object.assign(error instanceof AIProviderError ? error : new AIProviderError("invalid_output"), { usage }); }
}
