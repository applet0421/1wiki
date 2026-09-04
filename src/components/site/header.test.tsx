import { render, screen } from "@testing-library/react";
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
});
