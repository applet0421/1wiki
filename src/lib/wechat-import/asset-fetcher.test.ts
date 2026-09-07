import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { fetchWeChatAssets } from "./asset-fetcher";

describe("WeChat asset fetcher", () => {
  it("stages verified bytes while preserving duplicate image positions", async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
    const request = vi.fn(async () => ({ finalUrl: new URL("https://mmbiz.qpic.cn/a"), status: 200, headers: new Headers({ "content-type": "image/png" }), body: png }));
    const result = await fetchWeChatAssets([
      { position: 0, isCover: false, url: "https://mmbiz.qpic.cn/a", alt: "第一處" },
      { position: 1, isCover: false, url: "https://mmbiz.qpic.cn/a", alt: "第二處" },
    ], { request });
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].sha256).toBe(result.assets[1].sha256);
    expect(result.assets.map((asset) => asset.position)).toEqual([0, 1]);
  });

  it("fails an invalid image response instead of silently staging it", async () => {
    const result = await fetchWeChatAssets([{ position: 0, isCover: false, url: "https://mmbiz.qpic.cn/a", alt: "圖" }], {
      request: async () => ({ finalUrl: new URL("https://mmbiz.qpic.cn/a"), status: 200, headers: new Headers(), body: Buffer.from("not an image") }),
    });
    expect(result.complete).toBe(false);
    expect(result.failures[0]).toMatchObject({ code: "ASSET_TYPE_INVALID", position: 0 });
  });
});
