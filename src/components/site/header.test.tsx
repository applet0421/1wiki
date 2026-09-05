import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeader } from "./header";

describe("SiteHeader", () => {
  it("renders only repository-provided root navigation categories", () => {
    render(<SiteHeader locale="zh-tw" dictionary={getDictionary("zh-tw")} categories={[
      { id: "ai", name: "AI", segments: ["ai"] },
    ]} />);

    expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.queryByRole("link", { name: "軟體" })).not.toBeInTheDocument();
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

    const trigger = screen.getByRole("button", { name: "AI" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "ChatGPT" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "全部 AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
    expect(screen.queryByRole("link", { name: "Prompt" })).not.toBeInTheDocument();
    const childTrigger = screen.getByRole("button", { name: "ChatGPT" });
    fireEvent.click(childTrigger);
    expect(childTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Prompt" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt/prompt");
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
});
