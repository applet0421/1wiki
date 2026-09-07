import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeChatImportWorkspace } from "./wechat-import-workspace";
import * as actions from "@/app/(backoffice)/admin/posts/wechat-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(backoffice)/admin/posts/wechat-actions", () => ({ queueWeChatRewriteAction: vi.fn(), queueWeChatTransferAction: vi.fn(), queueWeChatRetryAction: vi.fn(), abandonWeChatImportAction: vi.fn() }));
const blocks = [{ id: "b-0001", type: "text" as const, html: "<p>完整改寫內容</p>" }, { id: "b-0002", type: "image" as const, assetId: "image1", alt: "示範圖片" }];
const imported = { id: "job1", status: "REWRITTEN", sourceUrl: "https://mp.weixin.qq.com/s/example", sourceTitle: "來源標題", sourceAccountName: "作者", sourceAuthor: null, sourcePublishedAt: null, sourceContentHtml: "<p>來源全文</p>", sourceBlocks: [{ id: "b-0001", type: "text" as const, html: "<p>來源全文</p>" }], targetLocale: "zh-tw", rewriteMode: "FAITHFUL" as const, errorSummary: null, failureStage: null, expiresAt: new Date(Date.now() + 1800000).toISOString(), updatedAt: new Date().toISOString(), serverNow: new Date().toISOString(), worker: null, rewriteInstructions: "", assets: [{ id: "image1", status: "STAGED", publicUrl: null, alt: "示範圖片", isCover: false, byteSize: 100 }], rewrittenDraft: { title: "改寫標題", excerpt: "摘要", slug: "guide", seoTitle: "SEO 標題", seoDescription: "描述", seoKeywords: "教學", needsVerification: [], blocks } };

describe("WeChat wizard", () => {
  beforeEach(() => vi.clearAllMocks());
  it("renders five steps and the full rewritten article including images", () => {
    render(<WeChatImportWorkspace imported={imported} />);
    expect(screen.getByRole("navigation", { name: "匯入步驟" })).toBeInTheDocument();
    expect(screen.getByText("完整改寫內容")).toBeInTheDocument();
    expect(screen.getAllByAltText("示範圖片")[0].getAttribute("src")).toMatch(/\/api\/admin\/wechat-assets\/image1$/);
    expect(screen.getByText(/暫存剩餘/)).toBeInTheDocument();
  });
  it("lets users review the original and settings without calling the model", () => {
    render(<WeChatImportWorkspace imported={imported} />);
    fireEvent.click(screen.getByRole("button", { name: "2 確認原文" }));
    expect(screen.getByText("來源全文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3 設定改寫" }));
    expect(screen.getByLabelText("目標語言")).toBeInTheDocument();
    expect(actions.queueWeChatRewriteAction).not.toHaveBeenCalled();
  });
  it("blocks expired work and offers a fresh import", () => {
    render(<WeChatImportWorkspace imported={{ ...imported, expiresAt: new Date(Date.now() - 1000).toISOString() }} />);
    expect(screen.getByRole("link", { name: "重新匯入" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "確認內容並轉存圖片" })).not.toBeInTheDocument();
  });

  it("allows transfer without a review acknowledgement and still confirms abandonment", () => {
    render(<WeChatImportWorkspace imported={imported} />);
    expect(screen.getByRole("button", { name: "確認內容並轉存圖片" })).toBeEnabled();
    expect(screen.queryByRole("checkbox", { name: "我已檢視完整內容、圖片與待核實事項。" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "放棄並清除暫存" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(actions.abandonWeChatImportAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
