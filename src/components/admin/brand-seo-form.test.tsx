import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandSeoForm } from "./brand-seo-form";

const initial = { siteName: "1Wiki", alternateNames: ["1wiki.org"], assets: { icon48: "/brand/icon-48.png", logo: "/brand/logo", defaultOg: "/brand/og-default" }, locales: { "zh-tw": { homeTitle: "中文", homeDescription: "摘要", ogTitle: "中文", ogDescription: "摘要" }, en: { homeTitle: "English", homeDescription: "Summary", ogTitle: "English", ogDescription: "Summary" }, ja: { homeTitle: "日本語", homeDescription: "概要", ogTitle: "日本語", ogDescription: "概要" } } };

describe("BrandSeoForm", () => {
  it("retains unsaved text when switching language tabs", async () => {
    render(<BrandSeoForm initial={initial} action={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("繁體中文 首頁標題"), { target: { value: "新的中文標題" } });
    fireEvent.click(screen.getByRole("tab", { name: "English" }));
    fireEvent.click(screen.getByRole("tab", { name: "繁體中文" }));
    expect(screen.getByLabelText("繁體中文 首頁標題")).toHaveValue("新的中文標題");
  });
});
