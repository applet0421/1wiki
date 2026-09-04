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

  it("expands a navigation category to reveal all lower-level category links", () => {
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
    expect(screen.getByRole("link", { name: "Prompt" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt/prompt");
  });
});
