import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostEditor } from "./post-editor";

vi.mock("@/app/admin/posts/actions", () => ({ savePostAction: vi.fn() }));

describe("PostEditor AI review metadata", () => {
  it("shows internal generation context and verification warnings", () => {
    render(<PostEditor categories={[{ id: "category", name: "軟體" }]} showAIGenerator={false} post={{
      id: "post", title: "LINE 教學", slug: "line-guide", excerpt: "摘要", contentHtml: "<p>內容</p>",
      coverImage: null, categoryId: "category", seoTitle: "SEO", seoDescription: "說明", seoKeywords: "LINE", canonicalUrl: null,
      aiContentType: "HOW_TO", primaryKeyword: "LINE 通知設定", searchIntent: "開啟 LINE 通知", aiSourceSupport: "MEDIUM",
      aiNeedsVerification: ["確認 iOS 最新選單名稱"],
    }} />);

    expect(screen.getByRole("region", { name: "AI 審核資訊" })).toHaveTextContent("How-to");
    expect(screen.getByText("LINE 通知設定")).toBeInTheDocument();
    expect(screen.getByText("確認 iOS 最新選單名稱")).toBeInTheDocument();
  });
});
