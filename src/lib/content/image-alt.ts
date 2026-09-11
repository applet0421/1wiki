import { load } from "cheerio";

function cleanText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function withBrand(value: string): string {
  const label = cleanText(value).replace(/(?:\s*-\s*1wiki\s*)+$/iu, "").trim();
  return `${label || "文章圖片"} - 1Wiki`;
}

export function normalizeArticleImageAlts(contentHtml: string, articleTitle: string): string {
  const $ = load(contentHtml, null, false);
  let currentHeading = "";
  const titleFallback = cleanText(articleTitle) || "文章圖片";

  $.root().find("*").each((_index, node) => {
    const element = $(node);
    if (/^h[1-6]$/iu.test(node.tagName || "")) {
      currentHeading = cleanText(element.text());
      return;
    }
    if (node.tagName !== "img") return;

    const existingAlt = cleanText(element.attr("alt") || "");
    element.attr("alt", withBrand(existingAlt || currentHeading || titleFallback));
  });

  return $.root().html() || "";
}
