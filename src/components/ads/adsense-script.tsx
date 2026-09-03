import Script from "next/script";
export function AdsenseScript({ clientId }: { clientId: string | null }) { if (!clientId) return null; return <Script id="onewiki-adsense" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`} />; }
