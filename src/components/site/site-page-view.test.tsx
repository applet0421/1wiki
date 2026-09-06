import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SitePageView } from "./site-page-view";

describe("SitePageView", () => {
  it("renders managed page content without an advertisement slot", () => {
    const { container } = render(<SitePageView title="隱私權政策" excerpt="頁面摘要" contentHtml="<p>頁面內容</p>" />);

    expect(screen.getByRole("heading", { name: "隱私權政策" })).toBeInTheDocument();
    expect(screen.getByText("頁面內容")).toBeInTheDocument();
    expect(container.querySelector(".ad-slot")).toBeNull();
  });
});
