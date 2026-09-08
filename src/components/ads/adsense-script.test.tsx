import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdsenseScript } from "./adsense-script";

vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => <div data-testid={props["data-testid"] as string} data-overlays={props["data-overlays"] as string | undefined} />,
}));

describe("AdsenseScript", () => {
  it("loads Google's bottom-only Anchor setting when the owner enables it", () => {
    render(<AdsenseScript clientId="ca-pub-123" enableBottomAnchor />);
    expect(screen.getByTestId("adsense-script")).toHaveAttribute("data-overlays", "bottom");
  });

  it("does not render without a live client id", () => {
    render(<AdsenseScript clientId={null} enableBottomAnchor />);
    expect(screen.queryByTestId("adsense-script")).not.toBeInTheDocument();
  });
});
