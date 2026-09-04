import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CategoryOption } from "@/lib/content/category-tree";
import { CategorySelect } from "./category-select";

const categories = [
  { id: "root", locale: "zh-tw", label: "AI", depth: 1, segments: ["ai"] },
  { id: "child", locale: "zh-tw", label: "— ChatGPT", depth: 2, segments: ["ai", "chatgpt"] },
  { id: "leaf", locale: "zh-tw", label: "—— Prompt", depth: 3, segments: ["ai", "chatgpt", "prompt"] },
  { id: "other", locale: "en", label: "Software", depth: 1, segments: ["software"] },
] satisfies CategoryOption[];

describe("CategorySelect", () => {
  it("shows every selectable level in the requested locale", () => {
    render(<CategorySelect name="categoryId" locale="zh-tw" categories={[...categories]} value="leaf" required />);

    expect(screen.getByRole("option", { name: "AI" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "— ChatGPT" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "—— Prompt" })).toBeEnabled();
    expect(screen.queryByRole("option", { name: "Software" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("leaf");
  });

  it("supports an all-categories choice and change callback", () => {
    const onChange = vi.fn();
    render(<CategorySelect name="category" locale="" categories={[...categories]} value="" includeAll onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "other" } });
    expect(screen.getByRole("option", { name: "全部分類" })).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith("other");
  });
});
