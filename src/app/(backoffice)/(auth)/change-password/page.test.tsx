import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn(async () => ({ id: "u1", username: "admin", displayName: "Admin", role: "OWNER", isActive: true, mustChangePassword: false })) }));
vi.mock("./actions", () => ({ changePasswordAction: vi.fn() }));
vi.mock("@/components/admin/admin-nav", () => ({ AdminNav: () => <aside aria-label="後台導覽">1Wiki 管理</aside> }));

import ChangePasswordPage from "./page";

describe("ChangePasswordPage", () => {
  it("uses the backoffice shell and keeps the password form", async () => {
    render(await ChangePasswordPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("main")).toHaveClass("admin-main");
    expect(screen.getByRole("heading", { name: "變更密碼" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存新密碼" })).toBeInTheDocument();
  });
});
