import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArticleCreationPage from "./page";

describe("ArticleCreationPage", () => {
  it("shows the three article creation choices with descriptions", () => {
    render(<ArticleCreationPage />);
    expect(screen.getByRole("heading", { name: "文章生成" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "開始 AI 選題" })).toHaveAttribute("href", "/admin/posts/generate");
    expect(screen.getByRole("link", { name: "開始 AI 改寫" })).toHaveAttribute("href", "/admin/posts/rewrite");
    expect(screen.getByRole("link", { name: "手動新增文章" })).toHaveAttribute("href", "/admin/posts/new");
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(["手動新增文章", "開始 AI 選題", "開始 AI 改寫"]);
    expect(document.querySelectorAll(".article-creation-option-key")).toHaveLength(0);
    expect(screen.getByText("貼上參考內容，分析主題並生成文章草稿。" )).toBeInTheDocument();
  });
});
