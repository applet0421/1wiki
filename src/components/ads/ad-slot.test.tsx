import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdSlot } from "./ad-slot";

afterEach(() => vi.unstubAllGlobals());

describe("AdSlot", () => {
  it("waits until a slot approaches the viewport before adding or initializing the ad", async () => {
    let intersect!: IntersectionObserverCallback;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback; }
      observe() {}
      disconnect() {}
    });
    const push = vi.fn();
    window.adsbygoogle = { push };
    render(<AdSlot placement="article_mid" config={{ mode: "live", placement: "article_mid", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId("adsense-article_mid")).not.toBeInTheDocument();
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("adsense-article_mid")).toBeInTheDocument();
  });

  it("does not initialize a hidden mobile sidebar", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const push = vi.fn();
    window.adsbygoogle = { push };
    render(<AdSlot placement="sidebar_desktop" config={{ mode: "live", placement: "sidebar_desktop", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId("adsense-sidebar_desktop")).not.toBeInTheDocument();
  });
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
