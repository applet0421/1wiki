import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBreadcrumbs } from "./category-breadcrumbs";

describe("CategoryBreadcrumbs", () => {
  it("links every category through its complete path", () => {
    render(<CategoryBreadcrumbs
      locale="zh-tw"
      ancestors={[
        { id: "root", name: "AI", slug: "ai" },
        { id: "child", name: "ChatGPT", slug: "chatgpt" },
      ]}
      current={{ id: "leaf", name: "Prompt", slug: "prompt" }}
    />);

    expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
    expect(screen.getByText("Prompt")).toHaveAttribute("aria-current", "page");
  });
});
