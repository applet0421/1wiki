import Script from "next/script";
export function AdsenseScript({ clientId, enableBottomAnchor = false }: { clientId: string | null; enableBottomAnchor?: boolean }) {
  if (!clientId) return null;
  return <Script id="onewiki-adsense" data-testid="adsense-script" async strategy="afterInteractive" crossOrigin="anonymous" data-overlays={enableBottomAnchor ? "bottom" : undefined} src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`} />;
}
