import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher", () => {
  it("marks the current locale and links every other locale home", () => {
    render(<LanguageSwitcher locale="zh-tw" />);
    expect(screen.getByRole("link", { name: "繁體中文" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja");
  });
});
