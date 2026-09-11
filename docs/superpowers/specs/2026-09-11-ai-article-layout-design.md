# AI 文章「清晰教學」版型設計

最後更新：2026-09-11

## 目的與範圍

為 1Wiki 的新生成、一般 AI 改寫與微信匯入文章建立一致的「清晰教學」閱讀版型。目標是將步驟、圖片與限制資訊賦予可驗證的語意與一致呈現，使讀者在桌機與手機均可快速掃讀，而不是只用通用文字與圖片樣式平鋪內容。

本次包含文章 HTML 合約、生成 Prompt、後台編輯器控制、公開文章與後台預覽 CSS、內容檢查與測試。既有已發布文章不會被批次重寫或自動變更。

不包含自動產生圖片、重做既有文章資料、改變文章廣告切段規則或更換完整的 rich-text editor 技術。

## 已確認的體驗方向

採用 mockup 的 A「清晰教學」方向：單欄可閱讀寬度、明確 H2/H3 節奏、步驟編號、受控的圖文區塊與保守的黃色注意提示卡。它是故障排除與操作指南的預設，而非將每一段文字卡片化。

文章預期閱讀順序：

1. 摘要／快速答案。
2. 二至五個 H2 主段落；需要時使用 H3。
3. 對應步驟後的圖片與圖說。
4. 注意、前置條件與限制資訊。
5. 結語或來源支持時才有的 FAQ。

## HTML 合約

新增下列安全、可選用的內容結構；所有外觀由站內 CSS 決定，AI 不能輸出 inline style、script 或任意 class。

```html
<div class="article-callout article-callout-warning">
  <strong>注意：先確認儲存空間</strong>
  <p>建議保留至少 2GB 可用空間。</p>
</div>

<ol class="article-steps">
  <li><p>開啟「好友⋅群組」。</p></li>
  <li><p>選擇「同步」並確認結果。</p></li>
</ol>

<figure class="article-image article-image-standard">
  <img src="https://…" alt="LINE 好友與群組頁面的同步按鈕" width="…" height="…">
  <figcaption>在手機 LINE 執行同步。</figcaption>
</figure>
```

允許的 class 僅為：

- `article-callout`、`article-callout-warning`：前置條件、限制與需要讀者留意的資訊。每一張卡都必須有明確標題與文字內容；不得用於一般段落。
- `article-steps`：一組有順序、可執行的操作。不得用於不具順序的列點。
- `article-image`：具語意的圖片容器，必須含一張有效 `img` 與非空白 `figcaption`。
- `article-image-standard`、`article-image-narrow`：一般與窄版圖片；預設為 standard，narrow 僅適用於圖示或窄長的設定畫面。

`sanitizeArticleHtml` 擴充 `figure`、`figcaption` 與限定的 `class` 白名單，同時保留既有圖片 URL、alt、尺寸及 YouTube iframe 限制。輸入不符合結構時，sanitize 結果會去除未允許 class；發布前檢查將提供可讀的修正提示。

## 生成與改寫資料流

三條既有路徑都共用上述合約：一般文章生成（`ARTICLE_GENERATE`）、一般 AI 改寫（`ARTICLE_REWRITE`）、微信匯入改寫（忠實／深度 SEO）。Prompt 各自保留原有的事實、語言與 SEO 約束，再補入：

- `contentHtml` 不含 H1，需以 H2/H3 建立清楚層級。
- 只在來源圖片可合理解釋時輸出 `figure`；圖片須緊接相關步驟或段落，附能描述用途的 alt 與圖說。
- 來源圖片意義不足時保留圖片但不捏造說明；回傳至既有 `needsVerification` 或匯入審核警示，而不是輸出假圖說。
- 需要讀者採取預防措施或有失敗風險時使用單一 warning callout；一般解釋不用 callout。
- 可依序執行的流程改用 `article-steps`；非順序事項仍使用普通 `ul`。

AI 輸出後先由 sanitizer 進行安全清理，再由 `validateArticleLayout` 回傳非阻斷的 diagnostics。診斷資料不改寫 HTML、不重新呼叫模型、不阻擋草稿；僅在發布前以警示清單提示作者。

## 元件責任

| 元件 | 責任 |
| --- | --- |
| `src/lib/content/sanitize.ts` | 白名單與結構安全，不決定視覺設計。 |
| `src/lib/content/article-layout.ts`（新增） | HTML 結構檢查、圖片序列與無障礙診斷；可獨立單元測試。 |
| `src/lib/ai/prompt.ts` 與微信 rewrite prompt | 指示模型輸出限定的文章版型語意。 |
| `src/components/admin/rich-text-editor.tsx` | 在游標或選取範圍插入／轉換步驟清單、提示卡與圖片 figure；編輯已有圖說與尺寸。 |
| `src/components/admin/post-editor.tsx` | 顯示保存內容的版型 diagnostics；草稿可存、發布前清楚提示。 |
| `src/app/globals.css` | 將 `article-prose` 的結構呈現在後台預覽與公開頁；不依賴後台專用 class。 |

## 後台互動

RichTextEditor 的工具列新增四個明確、可還原的操作：

1. 「步驟清單」：建立或轉換為 `ol.article-steps`。
2. 「注意提示」：插入有可編輯標題與內容的 warning callout。
3. 「圖片圖說」：選擇圖片後，將其包入 figure 並編輯 caption／alt。
4. 「圖片寬度」：在 standard 與 narrow 間切換。

圖片插入時仍先要求 alt。若作者未設定圖說，會以 visible status 告知「已插入圖片，尚待補上圖說」，而不是阻止儲存。選取非 figure 的既有 `img` 時，控制項會先建立符合合約的 figure；不破壞其來源 URL、alt 或寬高。

## 公開頁樣式

`article-prose` 保持單欄排版；圖片最大寬度為內容寬度、可置中，並以邊框、柔和陰影、圓角及圖說將截圖與文字分隔。窄圖有限制的桌機寬度，手機改為可用寬度並保留安全邊距。caption 使用次要但合格對比的文字。

步驟清單以明顯但克制的序號呈現，保留語意 `ol`。warning callout 採黃色表面與左側強調色，但色彩不作為唯一資訊載體：其標題固定以「注意」語意起首。H2/H3 調整間距，以避免圖片或 callout 黏著標題。這些 selectors 同時套用在後台 `rich-editor.article-prose` 與公開 `public-prose`。

## 錯誤處理與漸進導入

- 模型輸出不合法 class 或 HTML：依既有安全清理處理，不使生成工作失敗。
- 圖片無 URL、alt 或圖說：排除無 URL 圖片；其餘產生非阻斷 diagnostic，草稿仍可存。
- 不符合的 figure：當作普通安全內容顯示並給後台提示；不在發布時自動猜測或改寫內容。
- 既有文章：不遷移、不自動包裝；只有作者在後台操作「圖片圖說」／「套用清晰教學版型」後才改變 HTML。
- 所有 diagnostics 在 server 端再次計算，不能只信任前端結果。

導入順序：先實作 sanitizer、layout validator 與 CSS；再擴充 Prompt 並加測試；最後加入 editor controls 與發布前提示。每個步驟維持文章可安全保存與發布。

## 測試與驗收

- `sanitizeArticleHtml`：只保留限定元素、class 與圖片屬性；拒絕 inline style、未知 class 和不安全 URL。
- `article-layout`：測試有效 figure／steps／callout，並涵蓋缺 alt、缺 caption、連續圖片、標題跳級、過長段落等 diagnostics。
- Prompt：三個生成／改寫路徑都要求版型合約；來源不足時要求 verification 而非捏造圖說。
- RichTextEditor：工具列操作產出正確 HTML、已存在圖片可包裝為 figure、取消不改動內容、hidden input 同步。
- PostEditor：草稿可儲存；發布前顯示 diagnostics；正常版型不顯示警示。
- 公開文章：桌機與手機 viewport 的視覺／E2E 覆蓋，確認圖片不溢出、caption 可讀、步驟與提示卡不被廣告切段破壞。

驗收標準是新 AI 文章可在不手寫 HTML 的情況下產生清晰段落、至少一種正確語意元件，且在後台與公開頁保有相同圖文節奏；現有已發布文章的 HTML 與外觀不受變更。
