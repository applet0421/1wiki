import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeader } from "./header";

describe("SiteHeader", () => {
  it("renders only repository-provided root navigation categories", () => {
    render(<SiteHeader locale="zh-tw" dictionary={getDictionary("zh-tw")} categories={[
      { id: "ai", name: "AI", segments: ["ai"] },
    ]} />);

    expect(screen.getAllByRole("link", { name: "AI" })[0]).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.queryByRole("link", { name: "軟體" })).not.toBeInTheDocument();
  });

  it("does not expose the About page in public navigation", () => {
    render(<SiteHeader locale="zh-tw" dictionary={getDictionary("zh-tw")} categories={[
      { id: "ai", name: "AI", segments: ["ai"] },
      { id: "software", name: "軟體", segments: ["software"] },
      { id: "hardware", name: "手錶", segments: ["hardware"] },
    ]} />);

    expect(screen.queryByRole("link", { name: "關於我們" })).not.toBeInTheDocument();
  });

  it("expands a navigation category to reveal one level at a time", () => {
    render(<SiteHeader locale="zh-tw" dictionary={getDictionary("zh-tw")} categories={[
      {
        id: "ai",
        name: "AI",
        segments: ["ai"],
        children: [{
          id: "chatgpt",
          name: "ChatGPT",
          segments: ["ai", "chatgpt"],
          children: [{ id: "prompt", name: "Prompt", segments: ["ai", "chatgpt", "prompt"], children: [] }],
        }],
      },
    ]} />);

    expect(screen.getAllByRole("link", { name: "AI" })[0]).toHaveAttribute("href", "/zh-tw/category/ai");
    const trigger = screen.getAllByRole("button", { name: "AI" })[0];
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "ChatGPT" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "全部 AI" })[0]).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.getAllByRole("link", { name: "ChatGPT" })[0]).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
    expect(screen.queryByRole("link", { name: "Prompt" })).not.toBeInTheDocument();
    const childTrigger = screen.getAllByRole("button", { name: "ChatGPT" })[0];
    fireEvent.click(childTrigger);
    expect(childTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("link", { name: "Prompt" })[0]).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt/prompt");
    fireEvent.keyDown(childTrigger, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Prompt" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(childTrigger).toHaveFocus();
    const handledEscape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    handledEscape.preventDefault();
    fireEvent(document, handledEscape);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens a mobile navigation drawer with categories only", () => {
    render(<SiteHeader locale="zh-tw" dictionary={getDictionary("zh-tw")} categories={[
      { id: "ai", name: "AI", segments: ["ai"] },
      { id: "software", name: "軟體", segments: ["software"] },
    ]} />);

    const menuTrigger = screen.getByRole("button", { name: "開啟選單" });
    expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "主要導覽" })).not.toBeInTheDocument();

    fireEvent.click(menuTrigger);

    expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
    const drawer = screen.getByRole("dialog", { name: "主要導覽" });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(within(drawer).getByRole("link", { name: "軟體" })).toHaveAttribute("href", "/zh-tw/category/software");
    expect(within(drawer).queryByRole("link", { name: "關於我們" })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole("link", { name: "後台" })).not.toBeInTheDocument();
  });
});
