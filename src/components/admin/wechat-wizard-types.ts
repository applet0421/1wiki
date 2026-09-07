import type { ArticleBlock, WeChatRewriteDraft } from "@/lib/wechat-import/types";

export type WeChatAssetView = { id: string; status: string; publicUrl: string | null; alt: string; isCover: boolean; byteSize: number };
export type WeChatImportView = {
  id: string; status: string; sourceUrl: string; sourceTitle: string | null; sourceAccountName: string | null; sourceAuthor: string | null;
  sourcePublishedAt: string | null; sourceContentHtml: string | null; sourceBlocks: ArticleBlock[];
  targetLocale: string; rewriteMode: "FAITHFUL" | "DEEP_SEO"; rewriteInstructions: string;
  errorSummary: string | null; failureStage: string | null; expiresAt: string; updatedAt: string; serverNow: string;
  assets: WeChatAssetView[]; rewrittenDraft: WeChatRewriteDraft | null;
  worker: { lastHeartbeat: string; desiredState: string; lastError: string | null } | null;
};

export const wizardSteps = ["輸入連結", "確認原文", "設定改寫", "審閱結果", "完成匯入"];
export const activeImportStatuses = new Set(["FETCH_QUEUED", "FETCHING", "REWRITE_QUEUED", "REWRITING", "TRANSFER_QUEUED", "TRANSFERRING"]);
export const importStatusLabels: Record<string, string> = { FETCH_QUEUED: "等待 Worker 擷取", FETCHING: "正在擷取文章", FETCHED: "原文已備妥", REWRITE_QUEUED: "等待 Worker 改寫", REWRITING: "正在改寫文章", REWRITTEN: "改寫草稿待審閱", TRANSFER_QUEUED: "等待圖片轉存", TRANSFERRING: "正在轉存圖片", TRANSFER_FAILED: "圖片轉存未完成", READY: "草稿已備妥", FAILED: "此步驟未完成", UNKNOWN: "上次改寫結果不明", EXPIRED: "暫存已清除", ABANDONED: "工作已放棄" };

export function initialWizardStep(status: string, failureStage: string | null) {
  if (["TRANSFER_QUEUED", "TRANSFERRING", "TRANSFER_FAILED", "READY"].includes(status)) return 5;
  if (status === "REWRITTEN") return 4;
  if (["REWRITE_QUEUED", "REWRITING", "UNKNOWN"].includes(status) || failureStage === "REWRITE") return 3;
  return 2;
}

export function assetPreviewUrl(asset: WeChatAssetView) { return asset.publicUrl || `/api/admin/wechat-assets/${encodeURIComponent(asset.id)}`; }
