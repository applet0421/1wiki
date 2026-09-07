import { load } from "cheerio";
import type { WeChatImportErrorCode } from "./types";

export type ParsedWeChatArticle = {
  sourceUrl: URL;
  title: string;
  accountName: string;
  author: string;
  publishedAt: string;
  contentHtml: string;
};

export class WeChatParseError extends Error {
  constructor(public readonly code: Extract<WeChatImportErrorCode, "SOURCE_LOGIN_REQUIRED" | "SOURCE_VERIFICATION_REQUIRED" | "SOURCE_DELETED" | "SOURCE_ACCESS_DENIED" | "BODY_MISSING">) {
    super(code);
  }
}

function text($: ReturnType<typeof load>, selector: string): string {
  return $(selector).first().text().replace(/\s+/gu, " ").trim();
}

export function parseWeChatHtml(html: string, sourceUrl: URL): ParsedWeChatArticle {
  const $ = load(html);
  const pageText = $.root().text().replace(/\s+/gu, " ").trim();
  if (/環境異常|完成驗證|安全驗證|verify you are human/iu.test(pageText)) throw new WeChatParseError("SOURCE_VERIFICATION_REQUIRED");
  if (/請先登入|login required|登錄後/u.test(pageText)) throw new WeChatParseError("SOURCE_LOGIN_REQUIRED");
  if (/內容已被發布者刪除|已被刪除|content has been deleted/iu.test(pageText)) throw new WeChatParseError("SOURCE_DELETED");
  if (/違規|access denied|禁止訪問/iu.test(pageText)) throw new WeChatParseError("SOURCE_ACCESS_DENIED");
  const contentHtml = $("#js_content").first().html()?.trim();
  if (!contentHtml) throw new WeChatParseError("BODY_MISSING");
  const title = text($, "#activity-name") || $("meta[property='og:title']").attr("content")?.trim() || "";
  if (!title) throw new WeChatParseError("BODY_MISSING");
  return {
    sourceUrl,
    title,
    accountName: text($, "#js_name"),
    author: text($, "#js_author_name"),
    publishedAt: text($, "#publish_time"),
    contentHtml,
  };
}
