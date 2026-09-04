import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CategoryOption } from "@/lib/content/category-tree";
import { PostFilters } from "./post-filters";

const categories = [
  { id: "root", locale: "zh-tw", label: "AI", depth: 1, segments: ["ai"] },
  { id: "child", locale: "zh-tw", label: "— ChatGPT", depth: 2, segments: ["ai", "chatgpt"] },
  { id: "leaf", locale: "zh-tw", label: "—— Prompt", depth: 3, segments: ["ai", "chatgpt", "prompt"] },
  { id: "en", locale: "en", label: "AI", depth: 1, segments: ["ai"] },
] satisfies CategoryOption[];

describe("PostFilters", () => {
  it("shows hierarchical options and keeps locales separate", () => {
    render(<PostFilters categories={[...categories]} initialLocale="zh-tw" initialCategory="leaf" />);

    expect(screen.getByLabelText("文章分類")).toHaveValue("leaf");
    expect(screen.getByRole("option", { name: "— ChatGPT" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "—— Prompt" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("內容語系"), { target: { value: "en" } });
    expect(screen.getByLabelText("文章分類")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "— ChatGPT" })).not.toBeInTheDocument();
  });
});
