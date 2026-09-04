import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";
import { LocalizedInfoPage } from "@/components/site/localized-info-page";
import { notFound } from "next/navigation";
import { getLocaleConfig, isLocale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; const published = isLocale(locale) && getLocaleConfig(locale).publishedInfoPages.includes("privacy"); return { title: "Privacy", alternates: { canonical: `/${locale}/privacy` }, robots: published ? undefined : { index: false, follow: true } }; }

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <LocalizedInfoPage locale={locale} page="privacy">
    <InfoPage
      eyebrow="Privacy"
      title="隱私權政策"
      intro="本政策說明你使用 1Wiki 時，網站可能處理哪些資料以及這些資料的用途。"
    >
      <p className="policy-updated">最後更新：2026-09-04</p>
      <section>
        <h2>我們可能處理的資料</h2>
        <p>網站主機與安全服務可能記錄 IP 位址、瀏覽器類型、造訪時間、請求頁面及錯誤紀錄，用於維持服務、安全防護與問題排查。若你主動來信，我們也會處理你提供的電子郵件地址與訊息內容。</p>
      </section>
      <section>
        <h2>Cookie 與後台登入</h2>
        <p>公開讀者不需要建立帳號。管理後台會使用必要的登入 Cookie 維持工作階段；這類 Cookie 不用於跨網站廣告追蹤。</p>
      </section>
      <section>
        <h2>Google AdSense</h2>
        <p>網站日後可能使用 Google AdSense 顯示廣告。啟用後，Google 與其合作夥伴可能使用 Cookie 或其他技術提供、衡量與個人化廣告。需要取得同意的地區，網站會在廣告啟用前配置適用的同意管理機制。你也可以透過瀏覽器或 Google 的廣告設定管理偏好。</p>
      </section>
      <section>
        <h2>資料分享與保存</h2>
        <p>我們只在提供網站、遵守法律、保護服務安全或取得你同意時，與必要的服務供應商分享資料。資料只保留至達成上述用途所需的期間。</p>
      </section>
      <section>
        <h2>你的選擇</h2>
        <p>你可以封鎖或刪除 Cookie，但部分後台功能可能無法使用。若要詢問、更正或刪除你主動提供的資料，請使用聯絡頁所列方式提出。</p>
      </section>
      <section>
        <h2>政策更新</h2>
        <p>若資料處理方式或使用的服務改變，我們會更新本頁與上方日期。重大變更會以適當方式另行提示。</p>
      </section>
    </InfoPage>
    </LocalizedInfoPage>
  );
}
