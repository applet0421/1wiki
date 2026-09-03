import type { Metadata } from "next";
import { InfoPage } from "@/components/site/info-page";

export const metadata: Metadata = {
  title: "關於我們",
  description: "認識 1Wiki 的編輯方向、內容原則與網站使命。",
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About"
      title="關於 1Wiki"
      intro="我們把複雜的科技問題，整理成容易理解、可以照著操作的繁體中文教學。"
    >
      <section>
        <h2>我們在做什麼</h2>
        <p>1Wiki 專注於 AI、軟體、社群平台與 3C 產品的使用教學及疑難解答。每篇文章處理一個具體問題，讓讀者能快速判斷原因並找到下一步。</p>
      </section>
      <section>
        <h2>內容原則</h2>
        <ul>
          <li>優先提供可驗證、可實際操作的步驟。</li>
          <li>清楚標示必要條件、限制與可能風險。</li>
          <li>產品更新後，持續修訂已不適用的內容。</li>
          <li>不以增加廣告密度犧牲基本閱讀體驗。</li>
        </ul>
      </section>
      <section>
        <h2>AI 如何參與</h2>
        <p>編輯可以使用 AI 協助建立初稿，但內容在公開前仍需由後台使用者檢查、修改並主動發布。AI 不會直接把產生的文字自動發布到網站。</p>
      </section>
    </InfoPage>
  );
}
