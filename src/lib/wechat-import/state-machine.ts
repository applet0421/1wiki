import type { WeChatImportStatus } from "./types";

export const transitions: Record<WeChatImportStatus, readonly WeChatImportStatus[]> = {
  FETCH_QUEUED: ["FETCHING", "ABANDONED", "EXPIRED"],
  FETCHING: ["FETCHED", "FAILED", "FETCH_QUEUED", "ABANDONED"],
  FETCHED: ["REWRITE_QUEUED", "FETCH_QUEUED", "ABANDONED", "EXPIRED"],
  REWRITE_QUEUED: ["REWRITING", "ABANDONED", "EXPIRED"],
  REWRITING: ["REWRITTEN", "FAILED", "UNKNOWN"],
  REWRITTEN: ["REWRITE_QUEUED", "TRANSFER_QUEUED", "ABANDONED", "EXPIRED"],
  TRANSFER_QUEUED: ["TRANSFERRING", "ABANDONED", "EXPIRED"],
  TRANSFERRING: ["READY", "TRANSFER_FAILED"],
  TRANSFER_FAILED: ["TRANSFER_QUEUED", "ABANDONED", "EXPIRED"],
  READY: [],
  FAILED: ["FETCH_QUEUED", "REWRITE_QUEUED", "ABANDONED", "EXPIRED"],
  UNKNOWN: ["REWRITE_QUEUED", "ABANDONED", "EXPIRED"],
  ABANDONED: ["EXPIRED"],
  EXPIRED: [],
};

export function canTransition(from: WeChatImportStatus, to: WeChatImportStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: WeChatImportStatus, to: WeChatImportStatus): void {
  if (!canTransition(from, to)) throw new Error(`不允許從 ${from} 轉移到 ${to}`);
}
