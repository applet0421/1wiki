import { describe, expect, it } from "vitest";
import { resolveImageConfig } from "./image-config";

describe("image config", () => {
  it("keeps image defaults separate from text settings", () => {
    expect(resolveImageConfig({ GEMINI_API_KEY: "secret", GEMINI_MODEL: "text-model" })).toEqual({apiKey:"secret",model:"gemini-3.1-flash-image",imageSize:"512",aspectRatio:"9:16",altModel:"gemini-3.1-flash-lite"});
  });
  it("accepts native size and extended aspect ratios", () => {
    expect(resolveImageConfig({GEMINI_API_KEY:"secret",GEMINI_IMAGE_SIZE:"4K",GEMINI_IMAGE_ASPECT_RATIO:"1:8"})).toMatchObject({imageSize:"4K",aspectRatio:"1:8"});
  });
  it.each([{},{GEMINI_API_KEY:" "},{GEMINI_API_KEY:"secret",GEMINI_IMAGE_SIZE:"0.5K"},{GEMINI_API_KEY:"secret",GEMINI_IMAGE_ASPECT_RATIO:"9/16"}])("rejects invalid config without leaking input", (env) => {
    expect(() => resolveImageConfig(env)).toThrow("AI 服務尚未正確設定。");
  });
});
