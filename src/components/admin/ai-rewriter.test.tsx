import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rewriteArticleAction } from "@/app/admin/posts/rewrite-actions";
import { AIRewriter } from "./ai-rewriter";

const rewrittenArticle = {
  title: "改寫後標題",
  slug: "rewritten-article-title",
  contentHtml: "<h2>改寫重點</h2><p>台灣用語內容</p>",
  excerpt: "改寫後摘要",
  seoTitle: "改寫後 SEO 標題",
  seoDescription: "改寫後 SEO 描述",
  seoKeywords: "AI, 台灣",
};

vi.mock("@/app/admin/posts/rewrite-actions", () => ({
  rewriteArticleAction: vi.fn(),
}));

describe("AIRewriter", () => {
  beforeEach(() => {
    vi.mocked(rewriteArticleAction).mockResolvedValue({ ok: true, data: rewrittenArticle });
  });

  it("keeps the source editable and fills a saveable post editor with the rewritten result", async () => {
    render(<AIRewriter categories={[{ id: "ai", name: "AI" }]} provider="deepseek" />);

    fireEvent.change(screen.getByLabelText("原文章標題"), { target: { value: "原始標題" } });
    const sourceEditor = screen.getByLabelText("原文章內容");
    sourceEditor.innerHTML = "<h2>原始段落</h2><p>原始內容</p>";
    fireEvent.input(sourceEditor);
    fireEvent.click(screen.getByRole("button", { name: "使用 AI 改寫" }));

    expect(await screen.findByLabelText("標題")).toHaveValue("改寫後標題");
    expect(screen.getByLabelText("文章正文")).toHaveTextContent("台灣用語內容");
    expect(screen.getByDisplayValue("改寫後 SEO 描述")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存草稿" })).toBeInTheDocument();
    expect(screen.getByLabelText("原文章標題")).toHaveValue("原始標題");
  });

  it("keeps the source and restores the rewrite button when the request is interrupted", async () => {
    vi.mocked(rewriteArticleAction).mockRejectedValueOnce(new Error("連線中斷"));
    render(<AIRewriter categories={[]} provider="deepseek" />);

    fireEvent.change(screen.getByLabelText("原文章標題"), { target: { value: "不可遺失的標題" } });
    const sourceEditor = screen.getByLabelText("原文章內容");
    sourceEditor.innerHTML = "<p>不可遺失的內容</p>";
    fireEvent.input(sourceEditor);
    fireEvent.click(screen.getByRole("button", { name: "使用 AI 改寫" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 改寫失敗，請稍後再試");
    expect(screen.getByRole("button", { name: "使用 AI 改寫" })).toBeEnabled();
    expect(screen.getByLabelText("原文章標題")).toHaveValue("不可遺失的標題");
    expect(sourceEditor).toHaveTextContent("不可遺失的內容");
  });
});
