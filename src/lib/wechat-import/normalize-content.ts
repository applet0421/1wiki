import { load } from "cheerio";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import type { ArticleBlock } from "./types";
import type { ParsedWeChatArticle } from "./parse-wechat-html";

export type WeChatImageRequest = { position: number; isCover: false; url: string; alt: string };
export type NormalizedWeChatContent = { sanitizedHtml: string; blocks: ArticleBlock[]; imageRequests: WeChatImageRequest[]; warnings: string[] };

function blockId(index: number): string {
  return `b-${String(index + 1).padStart(4, "0")}`;
}

function isTrackingImage(element: { attribs?: Record<string, string> }): boolean {
  return element.attribs?.width === "1" || element.attribs?.height === "1";
}

export function normalizeWeChatContent(parsed: ParsedWeChatArticle): NormalizedWeChatContent {
  const $ = load(parsed.contentHtml, null, false);
  $("script, style, noscript, iframe, form, svg, canvas, video, audio").remove();
  const blocks: ArticleBlock[] = [];
  const imageRequests: WeChatImageRequest[] = [];
  const sanitizedFragments: string[] = [];
  let imagePosition = 0;

  const rootNodes = $.root().contents().toArray();
  const visit = (node: (typeof rootNodes)[number]) => {
    if (node.type === "text") {
      if (!$(node).text().trim()) return;
      const html = sanitizeArticleHtml(`<p>${$.html(node)}</p>`);
      blocks.push({ id: blockId(blocks.length), type: "text", html });
      sanitizedFragments.push(html);
      return;
    }
    if (node.type !== "tag") return;
    const element = $(node);
    if (node.tagName !== "img" && element.find("img").length) {
      element.contents().each((_index, child) => { visit(child); });
      return;
    }
    if (node.tagName === "img") {
      if (isTrackingImage(node)) return;
      const url = element.attr("data-src") || element.attr("src");
      if (!url) return;
      const assetId = `asset-${String(imagePosition + 1).padStart(4, "0")}`;
      const alt = (element.attr("alt") || "").trim();
      blocks.push({ id: blockId(blocks.length), type: "image", assetId, alt });
      imageRequests.push({ position: imagePosition, isCover: false, url, alt });
      imagePosition += 1;
      return;
    }
    element.find("script, style, noscript, iframe, form, svg, canvas, video, audio, img").remove();
    element.find("*").addBack().each((_childIndex, child) => {
      $(child).removeAttr("style").removeAttr("class").removeAttr("id");
      for (const attribute of Object.keys((child as { attribs?: Record<string, string> }).attribs || {})) {
        if (attribute.startsWith("on") || attribute.startsWith("data-")) $(child).removeAttr(attribute);
      }
    });
    if (node.tagName === "h1") element.replaceWith(`<h2>${element.html() || ""}</h2>`);
    const sanitized = sanitizeArticleHtml($.html(node)).trim();
    if (!sanitized || !element.text().trim()) return;
    blocks.push({ id: blockId(blocks.length), type: "text", html: sanitized });
    sanitizedFragments.push(sanitized);
  };
  $.root().contents().each((_index, node) => { visit(node); });

  return { sanitizedHtml: sanitizedFragments.join(""), blocks, imageRequests, warnings: [] };
}
