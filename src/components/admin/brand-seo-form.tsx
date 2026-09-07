"use client";

import { useState } from "react";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type LocaleValues = { homeTitle: string; homeDescription: string; ogTitle: string; ogDescription: string };
type Initial = { siteName: string; alternateNames: string[]; assets: { icon48: string; logo: string; defaultOg: string }; locales: Record<Locale, LocaleValues> };

export function BrandSeoForm({ initial, action }: { initial: Initial; action: (formData: FormData) => void | Promise<void> }) {
  const [active, setActive] = useState<Locale>("zh-tw");
  return <form action={action} className="admin-grid">
    <div className="panel"><h2>共用品牌</h2><label>網站名稱<input name="siteName" defaultValue={initial.siteName} required /></label><label>替代名稱<input name="alternateName" defaultValue={initial.alternateNames[0] || ""} /></label><label>48px 圖示網址<input name="icon48SourceUrl" /></label><label>Logo 圖片網址<input name="logoSourceUrl" /></label><label>預設分享圖網址<input name="defaultOgSourceUrl" /></label></div>
    <div className="panel"><h2>各語言首頁 SEO</h2><div role="tablist" aria-label="設定語言">{supportedLocales.map((locale) => <button key={locale} type="button" role="tab" aria-selected={active === locale} aria-controls={`${locale}-seo`} onClick={() => setActive(locale)}>{getLocaleConfig(locale).label}</button>)}</div>{supportedLocales.map((locale) => <div key={locale} id={`${locale}-seo`} role="tabpanel" hidden={active !== locale}><label>{getLocaleConfig(locale).label} 首頁標題<input aria-label={`${getLocaleConfig(locale).label} 首頁標題`} name={`${locale}.homeTitle`} defaultValue={initial.locales[locale].homeTitle} /></label><label>首頁摘要<textarea name={`${locale}.homeDescription`} defaultValue={initial.locales[locale].homeDescription} /></label><label>OG 標題<input name={`${locale}.ogTitle`} defaultValue={initial.locales[locale].ogTitle} /></label><label>OG 摘要<textarea name={`${locale}.ogDescription`} defaultValue={initial.locales[locale].ogDescription} /></label></div>)}</div>
    <div className="panel"><p className="muted">依本網站 metadata 的預覽，Google 顯示可能不同。Sitelinks 由 Google 自行選擇，無法手動設定。</p><button className="button button-primary" type="submit">儲存品牌與 SEO</button></div>
  </form>;
}
