import { load } from "cheerio";

export type ArticleLayoutDiagnosticCode =
  | "IMAGE_ALT_MISSING"
  | "IMAGE_CAPTION_MISSING"
  | "CONSECUTIVE_IMAGES"
  | "HEADING_LEVEL_SKIP"
  | "LONG_PARAGRAPH";

export type ArticleLayoutDiagnostic = {
  code: ArticleLayoutDiagnosticCode;
  message: string;
};

const messages: Record<ArticleLayoutDiagnosticCode, string> = {
  IMAGE_ALT_MISSING: "圖片缺少替代文字。",
  IMAGE_CAPTION_MISSING: "圖片缺少圖說。",
  CONSECUTIVE_IMAGES: "連續圖片過多，建議在圖片間補上說明。",
  HEADING_LEVEL_SKIP: "標題層級跳號，建議依序使用 H2 與 H3。",
  LONG_PARAGRAPH: "段落過長，建議拆分為較短的可掃讀內容。",
};

export function inspectArticleLayout(html: string): ArticleLayoutDiagnostic[] {
  const $ = load(html, null, false);
  const diagnostics: ArticleLayoutDiagnostic[] = [];
  const add = (code: ArticleLayoutDiagnosticCode) => {
    if (!diagnostics.some((item) => item.code === code)) diagnostics.push({ code, message: messages[code] });
  };
  let headingLevel = 0;
  let previousWasImage = false;

  $.root().children().each((_index, node) => {
    const element = $(node);
    const tag = node.type === "tag" ? node.name.toLowerCase() : "";
    const image = tag === "img" ? element : tag === "figure" ? element.find("img").first() : null;
    const isImage = !!image?.length;
    if (isImage) {
      if (!image!.attr("alt")?.trim()) add("IMAGE_ALT_MISSING");
      if (tag === "figure" && !element.find("figcaption").text().trim()) add("IMAGE_CAPTION_MISSING");
      if (previousWasImage) add("CONSECUTIVE_IMAGES");
    }
    previousWasImage = isImage;

    if (tag === "h2" || tag === "h3" || tag === "h4") {
      const currentLevel = Number(tag.slice(1));
      if (headingLevel && currentLevel > headingLevel + 1) add("HEADING_LEVEL_SKIP");
      headingLevel = currentLevel;
    }
    if (tag === "p" && element.text().replace(/\s/gu, "").length > 500) add("LONG_PARAGRAPH");
  });
  return diagnostics;
}
