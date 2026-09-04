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
    const links = screen.getByRole("navigation").querySelectorAll("a");
    expect([...links].map((link) => link.textContent)).toEqual(["文章", "分類", "Prompt 管理", "LLM 用量", "帳號", "密碼"]);
    expect(screen.getByRole("link", { name: "Prompt 管理" })).toHaveAttribute("href", "/admin/prompts");
    expect(screen.getByRole("link", { name: "LLM 用量" })).toHaveAttribute("href", "/admin/llm-usage");
  });

  it("hides owner-only management from editors", () => {
    render(<AdminNav user={{ ...baseUser, role: "EDITOR" }} />);
    expect(screen.queryByRole("link", { name: "Prompt 管理" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LLM 用量" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "帳號" })).not.toBeInTheDocument();
  });
});
