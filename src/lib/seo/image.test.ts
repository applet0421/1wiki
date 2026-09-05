import { describe, expect, it } from "vitest";
import { extractFirstBodyImage, resolveArticleImage } from "./image";

describe("article image resolver", () => {
  const siteUrl = "https://1wiki.example";
  it("prefers the cover image", () => expect(resolveArticleImage({ coverImage: "https://cdn.example/cover.webp", contentHtml: '<p><img src="https://cdn.example/body.webp"></p>', siteUrl })).toBe("https://cdn.example/cover.webp"));
  it("uses the first valid body image", () => expect(resolveArticleImage({ coverImage: "", contentHtml: '<img src="data:image/png;base64,abc"><p><img src="/body.webp"></p>', siteUrl })).toBe("https://1wiki.example/body.webp"));
  it("falls back to the default image", () => expect(resolveArticleImage({ contentHtml: "<p>No image</p>", siteUrl })).toBe("https://1wiki.example/og-default.svg"));
  it("extracts only absolute or site-relative image URLs", () => expect(extractFirstBodyImage('<img src="javascript:bad"><img src="https://cdn.example/ok.png">', siteUrl)).toBe("https://cdn.example/ok.png"));
});
