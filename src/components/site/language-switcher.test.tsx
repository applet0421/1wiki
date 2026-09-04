import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher", () => {
  it("shows the current locale in a collapsed language menu", () => {
    render(<LanguageSwitcher locale="zh-tw" />);

    expect(screen.getByRole("button", { name: "選擇語言：繁體中文" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "English" })).not.toBeInTheDocument();
  });

  it("opens the menu and links every locale home", () => {
    render(<LanguageSwitcher locale="zh-tw" />);

    fireEvent.click(screen.getByRole("button", { name: "選擇語言：繁體中文" }));

    expect(screen.getByRole("button", { name: "選擇語言：繁體中文" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "繁體中文" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja");
  });

  it("closes the menu with Escape or an outside click", () => {
    render(<LanguageSwitcher locale="zh-tw" />);
    const trigger = screen.getByRole("button", { name: "選擇語言：繁體中文" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
