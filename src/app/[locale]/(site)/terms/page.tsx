import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";
import { LocalizedInfoPage } from "@/components/site/localized-info-page";
import { notFound } from "next/navigation";
import { getLocaleConfig, isLocale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; const published = isLocale(locale) && getLocaleConfig(locale).publishedInfoPages.includes("terms"); return { title: "Terms", alternates: { canonical: `/${locale}/terms` }, robots: published ? undefined : { index: false, follow: true } }; }

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <LocalizedInfoPage locale={locale} page="terms">
    <InfoPage
      eyebrow="Terms"
      title="使用條款"
      intro="造訪或使用 1Wiki，即表示你同意以下基本規則；若不同意，請停止使用本網站。"
    >
      <p className="policy-updated">最後更新：2026-09-04</p>
      <section>
        <h2>內容用途</h2>
        <p>本站內容提供一般資訊與操作參考，不構成法律、醫療、財務或其他專業建議。產品介面與規則可能隨時更新，操作前請配合實際畫面及官方資訊判斷。</p>
      </section>
      <section>
        <h2>合理使用與風險</h2>
        <p>你應自行備份重要資料，並確認操作符合裝置、帳號與服務的規範。因個別環境差異，本站無法保證每個步驟都適用於所有情況，也不保證服務永不中斷或完全沒有錯誤。</p>
      </section>
      <section>
        <h2>智慧財產</h2>
        <p>除非另有標示，本站自行製作的文字、版面與圖像受相關法律保護。你可以分享文章連結及為個人非商業目的合理引用，但不得未經許可大量重製、建立鏡像或冒充本站內容來源。</p>
      </section>
      <section>
        <h2>外部服務</h2>
        <p>文章可能連結至第三方網站或產品。第三方服務由其各自條款與隱私權政策管理，本站不控制其內容、可用性或資料處理方式。</p>
      </section>
      <section>
        <h2>條款變更</h2>
        <p>我們可能因功能、法規或營運方式調整本條款。更新後的版本自刊登於本頁起生效，並會同步更新日期。</p>
      </section>
    </InfoPage>
    </LocalizedInfoPage>
  );
}
