import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArticleCreationPage from "./page";

describe("ArticleCreationPage", () => {
  it("shows the three article creation choices with descriptions", () => {
    render(<ArticleCreationPage />);
    expect(screen.getByRole("heading", { name: "文章生成" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /A.*AI 生成/ })).toHaveAttribute("href", "/admin/posts/generate");
    expect(screen.getByRole("link", { name: /B.*AI 改寫文章/ })).toHaveAttribute("href", "/admin/posts/rewrite");
    expect(screen.getByRole("link", { name: /C.*新增文章/ })).toHaveAttribute("href", "/admin/posts/new");
    expect(screen.getByText("貼上參考內容，分析主題並生成文章草稿。" )).toBeInTheDocument();
  });
});
