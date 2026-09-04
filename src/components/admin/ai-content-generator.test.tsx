import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeContentAction, generateContentDraftAction } from "@/app/(backoffice)/admin/posts/generate/actions";
import { AIContentGenerator } from "./ai-content-generator";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/(backoffice)/admin/posts/generate/actions", () => ({
  analyzeContentAction: vi.fn(),
  generateContentDraftAction: vi.fn(),
}));

const ideas = [
  { type: "TROUBLESHOOTING" as const, title: "LINE 收不到通知", primaryKeyword: "LINE 收不到通知", searchIntent: "排除通知問題", support: "STRONG" as const },
  { type: "HOW_TO" as const, title: "LINE 如何開啟通知", primaryKeyword: "LINE 通知設定", searchIntent: "開啟通知功能", support: "MEDIUM" as const },
];

describe("AIContentGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyzeContentAction).mockResolvedValue({ ok: true, data: { ideas } });
    vi.mocked(generateContentDraftAction).mockResolvedValue({ ok: true, data: { postId: "post-123" } });
  });

  it("analyzes a source, requires one idea, then opens the created draft", async () => {
    render(<AIContentGenerator provider="deepseek" />);
    fireEvent.change(screen.getByLabelText("內容語系"), { target: { value: "ja" } });
    const source = screen.getByLabelText("參考內容");
    expect(source).toHaveAttribute("maxlength", "50000");
    expect(screen.getByRole("button", { name: "分析內容" })).toBeDisabled();

    fireEvent.change(source, { target: { value: "LINE 通知設定參考資料" } });
    fireEvent.click(screen.getByRole("button", { name: "分析內容" }));
    await waitFor(() => expect(analyzeContentAction).toHaveBeenCalledWith({ locale: "ja", sourceContent: "LINE 通知設定參考資料" }));

    expect(await screen.findByRole("radio", { name: /LINE 收不到通知/ })).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成文章" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /LINE 收不到通知/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成文章" }));

    await waitFor(() => expect(generateContentDraftAction).toHaveBeenCalledWith(expect.objectContaining({ locale: "ja" })));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/posts/post-123?success=generated"));
  });

  it("shows an empty state without losing the source", async () => {
    vi.mocked(analyzeContentAction).mockResolvedValueOnce({ ok: true, data: { ideas: [] } });
    render(<AIContentGenerator provider="gemini" />);
    const source = screen.getByLabelText("參考內容");
    fireEvent.change(source, { target: { value: "沒有文章機會的參考資料" } });
    fireEvent.click(screen.getByRole("button", { name: "分析內容" }));

    expect(await screen.findByText("目前沒有發現適合建立獨立文章的主題。")).toBeInTheDocument();
    expect(source).toHaveValue("沒有文章機會的參考資料");
  });

  it("keeps the source and restores controls after analysis fails", async () => {
    vi.mocked(analyzeContentAction).mockRejectedValueOnce(new Error("network"));
    render(<AIContentGenerator provider="openai" />);
    const source = screen.getByLabelText("參考內容");
    fireEvent.change(source, { target: { value: "不可遺失的內容" } });
    fireEvent.click(screen.getByRole("button", { name: "分析內容" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 分析失敗，請稍後再試");
    expect(source).toHaveValue("不可遺失的內容");
    expect(screen.getByRole("button", { name: "分析內容" })).toBeEnabled();
  });
});
