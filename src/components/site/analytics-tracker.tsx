"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { classifyPagePath } from "@/lib/analytics/page-context";

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }

export function AnalyticsTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const context = classifyPagePath(pathname);
    if (!ready || !context || !window.gtag) return;
    window.gtag("event", "page_view", { page_location: window.location.href, page_title: document.title, page_type: context.pageType, locale: context.locale, content_slug: context.contentSlug, category_slug: context.categorySlug, root_category_slug: context.rootCategorySlug });
  }, [pathname, ready]);
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
    <Script id="onewiki-ga4" strategy="afterInteractive" onReady={() => setReady(true)}>{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false});`}</Script>
  </>;
}
