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
    render(<AdSlot placement="sidebar_desktop_sticky" config={{ mode: "live", placement: "sidebar_desktop_sticky", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByTestId("adsense-sidebar_desktop_sticky")).not.toBeInTheDocument();
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

  it("labels a live ad with AD while it is loading and after it is filled", async () => {
    render(<AdSlot placement="article_mid" config={{ mode: "live", placement: "article_mid", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);

    const slot = screen.getByTestId("adsense-article_mid");
    const container = screen.getByLabelText("廣告");
    expect(container).toHaveAttribute("data-ad-state", "loading");
    expect(screen.getByText("AD")).toBeInTheDocument();

    slot.setAttribute("data-ad-status", "filled");
    await waitFor(() => expect(container).toHaveAttribute("data-ad-state", "filled"));
    expect(screen.getByText("AD")).toBeInTheDocument();
  });

  it("collapses an unfilled ad after AdSense reports its status", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 2000, top: 2000, right: 300, bottom: 2280, left: 0, width: 300, height: 280, toJSON: () => ({}),
    });
    render(<AdSlot placement="article_mid" config={{ mode: "live", placement: "article_mid", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);

    const slot = screen.getByTestId("adsense-article_mid");
    const container = screen.getByLabelText("廣告");
    slot.setAttribute("data-ad-status", "unfilled");

    await waitFor(() => expect(container).toHaveAttribute("data-ad-state", "unfilled"));
  });

  it("defers collapsing a visible unfilled ad until it leaves the viewport", async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { callbacks.push(callback); }
      observe() {}
      disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 100, top: 100, right: 300, bottom: 380, left: 0, width: 300, height: 280, toJSON: () => ({}),
    });
    render(<AdSlot placement="article_mid" config={{ mode: "live", placement: "article_mid", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);

    act(() => callbacks[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    const slot = await screen.findByTestId("adsense-article_mid");
    const container = screen.getByLabelText("廣告");
    slot.setAttribute("data-ad-status", "unfilled");

    await waitFor(() => expect(container).toHaveAttribute("data-ad-state", "unfilled-pending"));
    act(() => callbacks[1]([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    await waitFor(() => expect(container).toHaveAttribute("data-ad-state", "unfilled"));
  });

  it("keeps AdSense optimized unfilled slots available for Google to manage", async () => {
    render(<AdSlot placement="article_mid" config={{ mode: "live", placement: "article_mid", shape: "rectangle", clientId: "ca-pub-123", slotId: "456" }} />);

    const slot = screen.getByTestId("adsense-article_mid");
    const container = screen.getByLabelText("廣告");
    slot.setAttribute("data-ad-status", "unfill-optimized");

    await waitFor(() => expect(container).toHaveAttribute("data-ad-state", "optimized"));
  });
});
