import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCurrentUser, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/adsense/article-ad-settings", () => ({
  getOrCreateArticleAdSettings: vi.fn(async () => ({ middleAdInterval: 2, maxMiddleAds: 3 })),
  hasArticleAdSettingsModel: vi.fn(() => false),
}));

import ArticleAdsPage from "./page";

describe("ArticleAdsPage", () => {
  it("allows only OWNER to manage article ad cadence", async () => {
    getCurrentUser.mockResolvedValue({ role: "EDITOR", mustChangePassword: false });
    await expect(ArticleAdsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/admin");
    getCurrentUser.mockResolvedValue({ role: "OWNER", mustChangePassword: false });
    render(await ArticleAdsPage({ searchParams: Promise.resolve({ error: "Cannot read properties of undefined (reading 'upsert')" }) }));
    expect(screen.getByRole("heading", { name: "文章廣告" })).toBeInTheDocument();
    expect(screen.getByLabelText("每幾個 H2 插入一則中段廣告")).toHaveValue(2);
    expect(screen.getByLabelText("每篇最多中段廣告數")).toHaveValue(3);
    expect(screen.getByRole("alert")).toHaveTextContent("請先完成資料庫 migration 並重啟開發伺服器");
    expect(screen.queryByText("Cannot read properties of undefined (reading 'upsert')")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "儲存廣告設定" })).toBeDisabled();
  });
});
