import { AIProviderError } from "./errors";

export const IMAGE_SIZES = ["512", "1K", "2K", "4K"] as const;
export const IMAGE_ASPECT_RATIOS = ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"] as const;
export type ImageConfig = {
  apiKey: string;
  model: string;
  imageSize: typeof IMAGE_SIZES[number];
  aspectRatio: typeof IMAGE_ASPECT_RATIOS[number];
  altModel: string;
};

export function resolveImageConfig(env: Record<string, string | undefined> = process.env): ImageConfig {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = (env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image").trim();
  const altModel = (env.GEMINI_IMAGE_ALT_MODEL ?? "gemini-3.1-flash-lite").trim();
  const imageSize = (env.GEMINI_IMAGE_SIZE ?? "512").trim();
  const aspectRatio = (env.GEMINI_IMAGE_ASPECT_RATIO ?? "9:16").trim();
  if (!apiKey || !/^[\w.-]+$/.test(model) || !/^[\w.-]+$/.test(altModel) || !(IMAGE_SIZES as readonly string[]).includes(imageSize) || !(IMAGE_ASPECT_RATIOS as readonly string[]).includes(aspectRatio)) {
    throw new AIProviderError("configuration");
  }
  return { apiKey, model, altModel, imageSize: imageSize as ImageConfig["imageSize"], aspectRatio: aspectRatio as ImageConfig["aspectRatio"] };
}
