import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdSlot } from "./ad-slot";

describe("AdSlot", () => {
  it("renders no node when configuration is unavailable", () => {
    const { container } = render(<AdSlot placement="article_mid" config={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("initializes one live slot only once across rerenders", async () => {
    const push = vi.fn();
    Object.assign(window, { adsbygoogle: { push } });
    const config = { mode: "live" as const, placement: "article_mid" as const, shape: "rectangle" as const, clientId: "ca-pub-123", slotId: "456" };
    const view = render(<AdSlot placement="article_mid" config={config} />);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    view.rerender(<AdSlot placement="article_mid" config={config} />);
    expect(push).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("adsense-article_mid")).toHaveAttribute("data-ad-slot", "456");
  });
});
