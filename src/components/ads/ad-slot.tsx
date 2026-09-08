"use client";

import { useEffect, useRef, useState } from "react";
import type { AdPlacement, AdSlotConfig } from "@/lib/adsense/config";

declare global { interface Window { adsbygoogle?: { push: (value: object) => unknown } } }

export function AdSlot({ placement, config }: { placement: AdPlacement; config: AdSlotConfig | null }) {
  const initialized = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const adElement = useRef<HTMLModElement>(null);
  const [ready, setReady] = useState(false);
  const [adState, setAdState] = useState<"loading" | "filled" | "optimized" | "unfilled-pending" | "unfilled">("loading");
  const desktopOnly = placement === "sidebar_desktop_sticky" || placement === "category_sidebar_desktop";

  useEffect(() => {
    if (config?.mode !== "live" || initialized.current) return;
    const desktop = desktopOnly ? window.matchMedia("(min-width: 1280px)") : null;
    let observer: IntersectionObserver | undefined;
    let active = true;
    function observe() {
      observer?.disconnect();
      if (desktop && !desktop.matches) return;
      if (typeof IntersectionObserver === "undefined") {
        setReady(true);
        return;
      }
      observer = new IntersectionObserver((entries) => {
        if (active && (!desktop || desktop.matches) && entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer?.disconnect();
        }
      }, { rootMargin: "0px 0px 300px 0px" });
      if (container.current) observer.observe(container.current);
    }
    observe();
    desktop?.addEventListener("change", observe);
    return () => { active = false; observer?.disconnect(); desktop?.removeEventListener("change", observe); };
  }, [config, desktopOnly]);

  useEffect(() => {
    if (!ready || config?.mode !== "live" || initialized.current) return;
    // Insert the ins element only when eligible, so another slot's queue entry
    // cannot initialize off-screen ads before their own observer fires.
    try {
      window.adsbygoogle = window.adsbygoogle || ([] as object[]);
      window.adsbygoogle.push({});
      initialized.current = true;
    } catch { initialized.current = true; }
  }, [config, ready]);

  useEffect(() => {
    const element = adElement.current;
    if (!ready || config?.mode !== "live" || !element) return;
    const liveAdElement = element;
    let visibilityObserver: IntersectionObserver | undefined;

    function applyStatus() {
      const status = liveAdElement.dataset.adStatus;
      if (status === "filled") {
        visibilityObserver?.disconnect();
        setAdState("filled");
        return;
      }
      if (status === "unfill-optimized") {
        visibilityObserver?.disconnect();
        setAdState("optimized");
        return;
      }
      if (status !== "unfilled") return;

      const bounds = container.current?.getBoundingClientRect();
      const isVisible = Boolean(bounds && bounds.bottom > 0 && bounds.top < window.innerHeight);
      if (!isVisible || typeof IntersectionObserver === "undefined") {
        setAdState("unfilled");
        return;
      }

      setAdState("unfilled-pending");
      visibilityObserver?.disconnect();
      visibilityObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => !entry.isIntersecting)) {
          setAdState("unfilled");
          visibilityObserver?.disconnect();
        }
      });
      if (container.current) visibilityObserver.observe(container.current);
    }

    applyStatus();
    const statusObserver = new MutationObserver(applyStatus);
    statusObserver.observe(liveAdElement, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => {
      statusObserver.disconnect();
      visibilityObserver?.disconnect();
    };
  }, [config, ready]);

  if (!config) return null;
  if (config.mode === "preview") return <div className={`ad-preview ad-${config.shape}`} data-testid={`ad-preview-${placement}`} data-ad-placement={placement}>AdSense · {placement}</div>;
  return <div ref={container} className={`ad-container ad-${config.shape}`} aria-label="廣告" data-ad-placement={placement} data-ad-state={adState}><span className="ad-label" aria-hidden="true">AD</span>{ready ? <ins ref={adElement} className="adsbygoogle" data-testid={`adsense-${placement}`} data-ad-placement={placement} data-ad-client={config.clientId} data-ad-slot={config.slotId} data-ad-format="auto" data-full-width-responsive="true" /> : null}</div>;
}
