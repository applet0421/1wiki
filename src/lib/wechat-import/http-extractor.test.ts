import { describe, expect, it } from "vitest";
import { extractViaHttp } from "./http-extractor";
import sharp from "sharp";

describe("WeChat HTTP extractor", () => {
  it("downloads large article pages and nested images with separate URL policies", async () => {
    const imageUrl = "https://mmbiz.qpic.cn/example.png";
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    const html = `<h1 id="activity-name">標題</h1><div id="js_content"><section><p>前文</p><p><img data-src="${imageUrl}"></p><p>後文</p></section></div><!--${"x".repeat(3 * 1024 * 1024)}-->`;
    const visited: string[] = [];
    const result = await extractViaHttp("https://mp.weixin.qq.com/s/example", { request: async (target, options) => {
      const url = new URL(target);
      visited.push(url.hostname);
      expect(options?.headers?.["User-Agent"]).toContain("Chrome/125");
      if (url.hostname === "mp.weixin.qq.com") expect(options?.maxBytes).toBeGreaterThan(Buffer.byteLength(html));
      else {
        expect(options?.validateUrl?.(url).hostname).toBe("mmbiz.qpic.cn");
        expect(() => options?.validateUrl?.(new URL("https://example.com/image.png"))).toThrow();
      }
      return { finalUrl: url, status: 200, headers: new Headers(), body: url.hostname === "mp.weixin.qq.com" ? Buffer.from(html) : png };
    } });
    expect(visited).toEqual(["mp.weixin.qq.com", "mmbiz.qpic.cn"]);
    expect(result.complete).toBe(true);
    expect(result.blocks.map((block) => block.type)).toEqual(["text", "image", "text"]);
    expect(result.assets).toHaveLength(1);
  });
  it("parses a complete source response through the shared normalization pipeline", async () => {
    const html = "<h1 id='activity-name'>標題</h1><div id='js_content'><p>內文</p></div>";
    const result = await extractViaHttp("https://mp.weixin.qq.com/s/example", {
      request: async () => ({ finalUrl: new URL("https://mp.weixin.qq.com/s/example"), status: 200, headers: new Headers(), body: Buffer.from(html) }),
    });
    expect(result).toMatchObject({ fetchMethod: "HTTP", complete: true, article: { title: "標題" } });
  });
});
