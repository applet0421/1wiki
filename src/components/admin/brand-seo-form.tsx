"use client";

import { useState, type ChangeEvent } from "react";
import { getLocaleConfig, supportedLocales, type Locale } from "@/lib/i18n/config";

type LocaleValues = { homeTitle: string; homeDescription: string; ogTitle: string; ogDescription: string };
type Initial = { siteName: string; alternateNames: string[]; assets: { icon48: string; logo: string; defaultOg: string }; assetSources: { icon48SourceUrl: string; logoSourceUrl: string; defaultOgSourceUrl: string }; locales: Record<Locale, LocaleValues> };

export function BrandSeoForm({ initial, action }: { initial: Initial; action: (formData: FormData) => void | Promise<void> }) {
  const [active, setActive] = useState<Locale>("zh-tw");
  const [assets, setAssets] = useState(initial.assetSources);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = async (asset: "icon48" | "logo" | "defaultOg", field: keyof typeof assets, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const signature = await fetch("/api/admin/brand-seo/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset, file: { name: file.name, type: file.type, size: file.size } }) });
      const signed = await signature.json() as { uploadUrl?: string; publicUrl?: string; error?: string };
      if (!signature.ok || !signed.uploadUrl || !signed.publicUrl) throw new Error(signed.error || "無法建立圖片上傳網址");
      const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!uploaded.ok) throw new Error("圖片上傳失敗，請重試");
      setAssets((current) => ({ ...current, [field]: signed.publicUrl }));
    } catch (error) { setUploadError(error instanceof Error ? error.message : "圖片上傳失敗，請重試"); }
  };
  return <form action={action} className="admin-grid">
    <div className="panel"><h2>共用品牌</h2><label>網站名稱<input name="siteName" defaultValue={initial.siteName} required /></label><label>替代名稱<input name="alternateName" defaultValue={initial.alternateNames[0] || ""} /></label><label>48px 圖示（正方形 PNG）<input type="file" accept="image/png" onChange={(event) => upload("icon48", "icon48SourceUrl", event)} /></label><input type="hidden" name="icon48SourceUrl" value={assets.icon48SourceUrl} /><label>Logo 圖片（JPEG、PNG、WebP）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("logo", "logoSourceUrl", event)} /></label><input type="hidden" name="logoSourceUrl" value={assets.logoSourceUrl} /><label>預設分享圖（建議 1200×630）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload("defaultOg", "defaultOgSourceUrl", event)} /></label><input type="hidden" name="defaultOgSourceUrl" value={assets.defaultOgSourceUrl} />{uploadError ? <p className="form-error" role="alert">{uploadError}</p> : null}</div>
    <div className="panel"><h2>各語言首頁 SEO</h2><div role="tablist" aria-label="設定語言">{supportedLocales.map((locale) => <button key={locale} type="button" role="tab" aria-selected={active === locale} aria-controls={`${locale}-seo`} onClick={() => setActive(locale)}>{getLocaleConfig(locale).label}</button>)}</div>{supportedLocales.map((locale) => <div key={locale} id={`${locale}-seo`} role="tabpanel" hidden={active !== locale}><label>{getLocaleConfig(locale).label} 首頁標題<input aria-label={`${getLocaleConfig(locale).label} 首頁標題`} name={`${locale}.homeTitle`} defaultValue={initial.locales[locale].homeTitle} /></label><label>首頁摘要<textarea name={`${locale}.homeDescription`} defaultValue={initial.locales[locale].homeDescription} /></label><label>OG 標題<input name={`${locale}.ogTitle`} defaultValue={initial.locales[locale].ogTitle} /></label><label>OG 摘要<textarea name={`${locale}.ogDescription`} defaultValue={initial.locales[locale].ogDescription} /></label></div>)}</div>
    <div className="panel"><p className="muted">依本網站 metadata 的預覽，Google 顯示可能不同。Sitelinks 由 Google 自行選擇，無法手動設定。</p><button className="button button-primary" type="submit">儲存品牌與 SEO</button></div>
  </form>;
}
