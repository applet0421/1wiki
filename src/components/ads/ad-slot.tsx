"use client";

import { useEffect, useRef } from "react";
import type { AdPlacement, AdSlotConfig } from "@/lib/adsense/config";

declare global { interface Window { adsbygoogle?: { push: (value: object) => unknown } } }

export function AdSlot({ placement, config }: { placement: AdPlacement; config: AdSlotConfig | null }) {
  const initialized = useRef(false);
  useEffect(() => {
    if (config?.mode !== "live" || initialized.current) return;
    try { window.adsbygoogle = window.adsbygoogle || { push: () => undefined }; window.adsbygoogle.push({}); initialized.current = true; }
    catch { initialized.current = true; }
  }, [config]);
  if (!config) return null;
  if (config.mode === "preview") return <div className={`ad-preview ad-${config.shape}`} data-ad-placement={placement}>AdSense · {placement}</div>;
  return <div className={`ad-container ad-${config.shape}`} data-ad-placement={placement}><ins className="adsbygoogle" data-testid={`adsense-${placement}`} data-ad-placement={placement} data-ad-client={config.clientId} data-ad-slot={config.slotId} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}
