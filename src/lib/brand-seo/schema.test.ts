import { describe, expect, it } from "vitest";
import { parseBrandSeoForm } from "./schema";

const input = {
  siteName: " 1Wiki ", alternateName: " ",
  assets: { icon48SourceUrl: "", logoSourceUrl: "", defaultOgSourceUrl: "" },
  locales: { "zh-tw": {}, en: {}, ja: {} },
};

describe("parseBrandSeoForm", () => {
  it("trims values and rejects blank brand names", () => {
    expect(parseBrandSeoForm(input).siteName).toBe("1Wiki");
    expect(() => parseBrandSeoForm({ ...input, siteName: "   " })).toThrow("網站名稱不可空白");
  });

  it("accepts only an issued brand-upload URL", () => {
    expect(() => parseBrandSeoForm({ ...input, assets: { ...input.assets, icon48SourceUrl: "https://elsewhere.example/icon.png" } })).toThrow("品牌圖片網址不正確");
  });
});
