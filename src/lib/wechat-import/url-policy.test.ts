import { describe, expect, it } from "vitest";
import { assertAllowedWeChatImageUrl, classifyWeChatRedirect, normalizeWeChatArticleUrl, resolvePublicAddress } from "./url-policy";

describe("WeChat URL policy", () => {
  it("normalizes only public WeChat article URLs", () => {
    expect(normalizeWeChatArticleUrl(" https://mp.weixin.qq.com/s/abc#section ").toString()).toBe("https://mp.weixin.qq.com/s/abc");
    expect(normalizeWeChatArticleUrl("https://mp.weixin.qq.com/s?__biz=abc&mid=1").toString()).toBe("https://mp.weixin.qq.com/s?__biz=abc&mid=1");
    for (const value of ["http://mp.weixin.qq.com/s/abc", "https://user@mp.weixin.qq.com/s/abc", "https://mp.weixin.qq.com:8443/s/abc", "https://example.com/s/abc", "https://mp.weixin.qq.com/cgi-bin/abc", "https://mp.weixin.qq.com/s"]) {
      expect(() => normalizeWeChatArticleUrl(value)).toThrow(/公開微信文章/);
    }
  });

  it("rejects a DNS answer in a private network", async () => {
    await expect(resolvePublicAddress("mp.weixin.qq.com", async () => [{ address: "127.0.0.1", family: 4 }] as never)).rejects.toThrow(/公開網路/);
    await expect(resolvePublicAddress("mp.weixin.qq.com", async () => [{ address: "::1", family: 6 }] as never)).rejects.toThrow(/公開網路/);
  });

  it("accepts only known HTTPS WeChat image hosts", () => {
    expect(assertAllowedWeChatImageUrl("https://mmbiz.qpic.cn/article-image?wx_fmt=jpeg").hostname).toBe("mmbiz.qpic.cn");
    expect(() => assertAllowedWeChatImageUrl("https://evil-mmbiz.qpic.cn/a")).toThrow(/圖片來源/);
    expect(() => assertAllowedWeChatImageUrl("http://mmbiz.qpic.cn/a")).toThrow(/圖片來源/);
  });

  it("classifies verification and login redirects without following them", () => {
    expect(classifyWeChatRedirect(new URL("https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha?poc_token=test"))).toBe("SOURCE_VERIFICATION_REQUIRED");
    expect(classifyWeChatRedirect(new URL("https://mp.weixin.qq.com/cgi-bin/login"))).toBe("SOURCE_LOGIN_REQUIRED");
  });
});
