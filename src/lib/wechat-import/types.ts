export const weChatImportStatuses = [
  "FETCH_QUEUED", "FETCHING", "FETCHED", "REWRITE_QUEUED", "REWRITING", "REWRITTEN",
  "TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "READY", "FAILED", "UNKNOWN", "ABANDONED", "EXPIRED",
] as const;

export type WeChatImportStatus = (typeof weChatImportStatuses)[number];
export type WeChatRewriteMode = "FAITHFUL" | "DEEP_SEO";
export type WeChatAssetStatus = "STAGED" | "UPLOADING" | "READY" | "FAILED" | "REMOVED";

export type ArticleBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; assetId: string; alt: string };

export type WeChatRewriteDraft = {
  title: string;
  slug: string;
  excerpt: string;
  blocks: ArticleBlock[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  needsVerification: string[];
};

export type WeChatEditorDraft = Omit<WeChatRewriteDraft, "blocks"> & {
  sourceImportId: string;
  coverImage: string;
  contentHtml: string;
};

export type WeChatImportReport = {
  generated_at: string;
  summary: {
    stage: "fetch" | "rewrite" | "transfer";
    status: "success" | "failure" | "partial";
    fetchMethod?: "HTTP" | "CHROMIUM";
    title?: string;
    contentCharacters?: number;
    expectedImages?: number;
    successfulImages?: number;
    failedImages?: number;
  };
  success: Array<{ code: string; item: string; detail?: string }>;
  failure: Array<{ code: string; item: string; retryable: boolean; detail: string }>;
};

export const weChatImportErrorCodes = [
  "INVALID_URL", "SOURCE_LOGIN_REQUIRED", "SOURCE_VERIFICATION_REQUIRED", "SOURCE_DELETED", "SOURCE_ACCESS_DENIED",
  "FETCH_TIMEOUT", "FETCH_REDIRECT_REJECTED", "BODY_MISSING", "CONTENT_INCOMPLETE", "HTML_LIMIT_EXCEEDED",
  "ASSET_LIMIT_EXCEEDED", "ASSET_HOST_REJECTED", "ASSET_DOWNLOAD_FAILED", "ASSET_TYPE_INVALID", "ASSET_DECODE_FAILED",
  "LLM_FAILED", "LLM_RESULT_UNKNOWN", "LLM_OUTPUT_INVALID", "IMAGE_SET_MISMATCH", "R2_UPLOAD_FAILED", "IMPORT_EXPIRED",
] as const;

export type WeChatImportErrorCode = (typeof weChatImportErrorCodes)[number];
