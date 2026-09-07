import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/brand-seo/repository", () => ({ resolveBrandSeo: vi.fn(async () => ({ siteName: "1Wiki Help", assets: { favicon: "/favicon.ico", icon48: "/brand/icon-48.png", logo: "/brand/logo", defaultOg: "/brand/og-default" }, locales: { "zh-tw": { homeTitle: "首頁", homeDescription: "首頁摘要", ogTitle: "首頁", ogDescription: "首頁摘要" } } })) }));
import manifest from "./manifest";

describe("web manifest", () => {
  it("publishes the configured default-locale brand manifest", async () => {
    const value = await manifest();
    expect(value.name).toBe("首頁");
    expect(value.icons).toEqual([
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/brand/icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ]);
  });
});
