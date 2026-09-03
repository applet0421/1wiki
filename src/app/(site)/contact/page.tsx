import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "聯絡我們",
  description: "向 1Wiki 提供內容更正、合作或網站問題回報。",
};

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return (
    <InfoPage
      eyebrow="Contact"
      title="聯絡我們"
      intro="如果你發現教學步驟需要更新、內容有誤，或想回報網站問題，歡迎與我們聯絡。"
    >
      <section>
        <h2>聯絡方式</h2>
        {email ? (
          <p>請寄信至 <a href={`mailto:${email}`}>{email}</a>，並在主旨簡短說明問題類型。</p>
        ) : (
          <p>網站目前尚未公開聯絡信箱。正式上線前，站方會在此頁提供可用的電子郵件地址。</p>
        )}
      </section>
      <section>
        <h2>回報內容問題</h2>
        <p>為了讓我們更快確認，請附上文章網址、需要更正的段落、你使用的裝置或軟體版本，以及實際看到的錯誤訊息。請勿寄送密碼、驗證碼或其他敏感資料。</p>
      </section>
    </InfoPage>
  );
}
