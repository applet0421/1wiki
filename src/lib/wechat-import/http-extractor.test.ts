import { describe, expect, it } from "vitest";
import { extractViaHttp } from "./http-extractor";

describe("WeChat HTTP extractor", () => {
  it("parses a complete source response through the shared normalization pipeline", async () => {
    const html = "<h1 id='activity-name'>標題</h1><div id='js_content'><p>內文</p></div>";
    const result = await extractViaHttp("https://mp.weixin.qq.com/s/example", {
      request: async () => ({ finalUrl: new URL("https://mp.weixin.qq.com/s/example"), status: 200, headers: new Headers(), body: Buffer.from(html) }),
    });
    expect(result).toMatchObject({ fetchMethod: "HTTP", complete: true, article: { title: "標題" } });
  });
});
