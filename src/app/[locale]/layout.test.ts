import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/brand-seo/repository", () => ({ resolveBrandSeo: vi.fn(async () => ({ siteName: "1Wiki Help", alternateNames: ["Help Center"], assets: { favicon: "/favicon.ico", icon48: "/brand/icon-48.png", logo: "/brand/logo", defaultOg: "/brand/og-default" }, locales: { "zh-tw": { homeTitle: "中文", homeDescription: "中文摘要", ogTitle: "中文 OG", ogDescription: "中文 OG 摘要" }, en: { homeTitle: "English title", homeDescription: "English summary", ogTitle: "English OG", ogDescription: "English OG summary" }, ja: { homeTitle: "日本語", homeDescription: "日本語概要", ogTitle: "日本語 OG", ogDescription: "日本語 OG 概要" } } })) }));
import { generateMetadata } from "./layout";

describe("localized site metadata", () => {
  it("publishes a branded, task-specific homepage description", async () => {
    const metadata = await generateMetadata({ children: null, params: Promise.resolve({ locale: "zh-tw" }) });

    expect(metadata.description).toBe("中文摘要");
  });

  it("advertises stable raster and vector favicon URLs", async () => {
    const metadata = await generateMetadata({ children: null, params: Promise.resolve({ locale: "zh-tw" }) });

    expect(metadata.icons).toEqual({
      icon: [
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
        { url: "/brand/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    });
  });

  it("uses the saved locale homepage summary and shared brand name", async () => {
    const metadata = await generateMetadata({ children: null, params: Promise.resolve({ locale: "en" }) });
    expect(metadata.description).toBe("English summary");
    expect(metadata.openGraph).toMatchObject({ siteName: "1Wiki Help", title: "English OG", images: ["/brand/og-default"] });
  });
});
