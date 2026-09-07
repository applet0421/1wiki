import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCurrentUser, redirect } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/brand-seo/repository", () => ({ resolveBrandSeo: vi.fn(async () => ({ siteName: "1Wiki", alternateNames: ["1wiki.org"], assets: {}, locales: { "zh-tw": { homeTitle: "中文", homeDescription: "中文摘要", ogTitle: "中文", ogDescription: "中文摘要" }, en: { homeTitle: "English", homeDescription: "English summary", ogTitle: "English", ogDescription: "English summary" }, ja: { homeTitle: "日本語", homeDescription: "日本語概要", ogTitle: "日本語", ogDescription: "日本語概要" } } })) }));
import BrandSeoPage from "./page";

describe("BrandSeoPage", () => {
  it("allows only OWNER to open the settings page", async () => {
    getCurrentUser.mockResolvedValue({ role: "EDITOR", mustChangePassword: false });
    await expect(BrandSeoPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/admin");
    getCurrentUser.mockResolvedValue({ role: "OWNER", mustChangePassword: false });
    render(await BrandSeoPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "品牌與 SEO" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "繁體中文" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "日本語" })).toBeInTheDocument();
  });
});
