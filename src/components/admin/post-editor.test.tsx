import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostEditor } from "./post-editor";

vi.mock("@/app/(backoffice)/admin/posts/actions", () => ({ savePostAction: vi.fn() }));

describe("PostEditor AI review metadata", () => {
  it("shows internal generation context and verification warnings", () => {
    render(<PostEditor locale="zh-tw" categories={[{ id: "category", name: "軟體", locale: "zh-tw" }]} showAIGenerator={false} post={{
      id: "post", title: "LINE 教學", slug: "line-guide", excerpt: "摘要", contentHtml: "<p>內容</p>",
      locale: "zh-tw", status: "DRAFT", coverImage: null, categoryId: "category", seoTitle: "SEO", seoDescription: "說明", seoKeywords: "LINE", canonicalUrl: null,
      aiContentType: "HOW_TO", primaryKeyword: "LINE 通知設定", searchIntent: "開啟 LINE 通知", aiSourceSupport: "MEDIUM",
      aiNeedsVerification: ["確認 iOS 最新選單名稱"],
    }} />);

    expect(screen.getByRole("region", { name: "AI 審核資訊" })).toHaveTextContent("How-to");
    expect(screen.getByText("LINE 通知設定")).toBeInTheDocument();
    expect(screen.getByText("確認 iOS 最新選單名稱")).toBeInTheDocument();
  });

  it("renders a locale selector and filters categories when it changes", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<PostEditor
      locale="en"
      categories={[
        { id: "en-cat", name: "English AI", locale: "en" },
        { id: "ja-cat", name: "日本語 AI", locale: "ja" },
      ]}
      provider="deepseek"
      showAIGenerator={false}
    />);

    const selector = screen.getByLabelText("內容語系");
    expect(selector).toHaveValue("en");
    expect(screen.getByRole("option", { name: "English AI" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "日本語 AI" })).not.toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "ja" } });
    expect(screen.getByRole("option", { name: "日本語 AI" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "English AI" })).not.toBeInTheDocument();
  });
});
