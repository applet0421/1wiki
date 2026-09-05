import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

vi.mock("@/app/(backoffice)/(auth)/login/actions", () => ({ logoutAction: vi.fn() }));

const baseUser = {
  id: "user-1",
  username: "rex",
  displayName: "Mr. Rex",
  isActive: true,
  mustChangePassword: false,
};

describe("AdminNav", () => {
  it("shows Prompt, usage, and account management to owners in order", () => {
    render(<AdminNav user={{ ...baseUser, role: "OWNER" }} />);
    expect(screen.getByRole("link", { name: "作者庫" })).toHaveAttribute("href", "/admin/authors");
    const links = screen.getByRole("navigation").querySelectorAll("a");
    expect([...links].map((link) => link.textContent)).toEqual(["文章", "文章生成", "分類", "作者庫", "Prompt 管理", "LLM 用量", "流量監測", "搜尋引擎", "Worker 監控", "帳號", "密碼"]);
    expect(screen.queryByRole("link", { name: "新增內容" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "文章生成" })).toHaveAttribute("href", "/admin/posts/create");
    expect(screen.getByRole("link", { name: "Prompt 管理" })).toHaveAttribute("href", "/admin/prompts");
    expect(screen.getByRole("link", { name: "LLM 用量" })).toHaveAttribute("href", "/admin/llm-usage");
    expect(screen.getByRole("link", { name: "流量監測" })).toHaveAttribute("href", "/admin/traffic");
    expect(screen.getByRole("link", { name: "Worker 監控" })).toHaveAttribute("href", "/admin/worker");
  });

  it("hides owner-only management from editors", () => {
    render(<AdminNav user={{ ...baseUser, role: "EDITOR" }} />);
    expect(screen.queryByRole("link", { name: "Prompt 管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LLM 用量" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Worker 監控" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "帳號" })).not.toBeInTheDocument();
  });
});
