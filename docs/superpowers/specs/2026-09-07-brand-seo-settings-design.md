# 1Wiki 品牌與搜尋呈現設定設計

最後更新：2026-09-07

## 1. 目標與界線

此功能讓 OWNER 在後台維護 1Wiki 的共用品牌資產，以及繁體中文、英文、日文各自的首頁搜尋呈現資料。公開網站讀取已儲存設定來輸出 favicon、網站名稱、首頁 title／description、Open Graph 與 JSON-LD；未儲存時一律安全回退至目前程式內的預設值。

本功能改善可控制的搜尋訊號，但不承諾或模擬 Google 的最終顯示。Google 會自行選擇搜尋結果摘要與 sitelinks；後台不提供 sitelinks 的手動編輯欄位。

本功能不包含：

- 任意新增、停用或刪除語言的後台「語言管理」。
- 跨語言文章翻譯、文章配對或內容同步。
- `hreflang`。
- 直接呼叫 Google API 來變更搜尋結果。

## 2. 已確認的決策

| 主題 | 決策 |
| --- | --- |
| 內容模型 | `zh-tw`、`en`、`ja` 是各自獨立的內容站；同一 slug 不代表翻譯或替代頁。 |
| 語言來源 | 唯一語言清單維持 `src/lib/i18n/config.ts` 的 `supportedLocales`。後台只讀取此清單並顯示設定分頁。 |
| 搜尋國際化 | 獨立內容不輸出 `hreflang`；每頁維持自己的 canonical、可見語言內容、`html lang`、Open Graph locale 與 JSON-LD `inLanguage`。 |
| 權限 | 僅 `OWNER` 可讀取、上傳或儲存品牌與 SEO 設定；`EDITOR` 看不到導覽連結，也不能經由 action 或 API 寫入。 |
| 資產網址 | 公開 `<link rel="icon">`、manifest、Organization logo 與預設 OG 圖均使用穩定的本站路徑；後台換圖只改路徑背後的設定，不把帶雜湊的 R2 上傳網址暴露為主要品牌網址。 |
| 空白語系 | 無已發布內容的語系維持既有 `noindex, follow`；填寫該語系 SEO 欄位不會讓空白站被索引。 |

## 3. 資料模型與預設值

新增兩個 Prisma model，均不用 locale enum，以配合既有語系架構：

```prisma
model BrandSeoSettings {
  id                String   @id // 固定為 "default"
  siteName          String
  alternateName     String?
  faviconSourceUrl  String?  @db.Text
  icon48SourceUrl   String?  @db.Text
  logoSourceUrl     String?  @db.Text
  defaultOgSourceUrl String? @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model LocaleSeoSettings {
  locale            String   @id
  homeTitle         String?
  homeDescription   String?  @db.Text
  ogTitle           String?
  ogDescription     String?  @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

`BrandSeoSettings` 是 singleton；repository 只以常數 `default` 讀寫。`LocaleSeoSettings.locale` 必須先以 `isLocale()` 驗證，永遠不接受任意字串。migration 不預建必要資料列，因此首次開啟與任何欄位留白都能由程式預設值正常服務公開頁。

預設值仍由現有 `siteConfig` 與語系 dictionary 提供：網站名稱為 `1Wiki`、首頁文字使用各語系 dictionary、favicon 使用目前的 `/favicon.ico` 與 `/icon-48.png`、預設分享圖使用 `/og-default.svg`。後台設定只覆寫有填入的欄位，不把空字串寫成公開輸出。

## 4. 公開輸出與資料流

建立小型 `brand-seo` repository，唯一責任是「讀取設定、驗證並套用 fallback」。它回傳已解析的 `ResolvedBrandSeo`，使 layout、manifest、structured data 與 metadata 不各自寫一套 fallback 規則。

```text
OWNER 表單／資產上傳
        │
        ▼
server action 驗證、Prisma upsert、重新驗證
        │
        ▼
brand-seo repository ──► locale layout / manifest / JSON-LD / OG metadata
        │
        ▼
穩定本站品牌資產 route ──► R2 儲存來源（或程式 fallback）
```

公開輸出規則：

- `src/app/[locale]/layout.tsx` 以目前 locale 的 `homeTitle`、`homeDescription` 建立首頁 metadata；`siteName` 永遠取共用品牌名稱。文章與分類等非首頁維持原本由內容決定的 title／description，但其 Open Graph `siteName`、Organization 名稱與 logo 取共用設定。
- `src/app/manifest.ts` 使用預設語系（`zh-tw`）的首頁名稱／描述，並使用穩定的品牌 icon 路徑。
- `buildWebSiteStructuredData` 的 `name`、`alternateName` 與 `buildOrganizationStructuredData` 的名稱、logo 均從解析後品牌設定取值；每個 locale 仍各自輸出正確 `inLanguage`。
- 新增固定 public route，例如 `/brand/favicon.ico`、`/brand/icon-48.png`、`/brand/logo.png`、`/brand/og-default.png`。route 以設定的 R2 原始檔回應相應內容，未設定時回退至既有公開資產。品牌 metadata 使用這些固定網址，讓更換檔案不需要改每一個消費端。
- 儲存後重新驗證 `/zh-tw`、`/en`、`/ja`、`/manifest.webmanifest`、各品牌資產 route 與 `/sitemap.xml`；也重新驗證 `/admin/brand-seo`。公開頁仍保有既有 ISR 行為，避免等待整個快取週期才看到新設定。

## 5. 後台介面與行為

新增 `/admin/brand-seo`，並在 OWNER 專用側欄加入「品牌與 SEO」。頁面分為兩段：

1. **共用品牌**：網站名稱、替代名稱、favicon、48px icon、Organization logo、預設 OG 圖。每個欄位都有目前預覽、規格與「沒有上傳時使用預設」說明。
2. **各語言首頁 SEO**：從 `supportedLocales` 生成繁中／English／日本語分頁。每頁可輸入首頁 title、description、OG title、OG description，並看到該語言的搜尋結果預覽。

語言分頁切換僅在瀏覽器狀態中切換，不提交表單，也不遺失尚未儲存的輸入。儲存採單一 action：先完整驗證共用資料與全部 locale 資料，再以 transaction upsert；任一欄不合法時不寫入部分設定。成功後回到同一頁顯示 status 訊息；失敗保留使用者輸入並以欄位層級錯誤說明。

預覽清楚標示為「依本網站 metadata 的預覽，Google 顯示可能不同」。在 sitelinks 區塊只說明其由 Google 演算法選擇，並連到公開導覽、分類與 sitemap 的健康度，不提供不可實現的控制項。

## 6. 上傳、驗證與安全

既有一般文章圖片上傳 API 允許已登入使用者使用，不能直接拿來當品牌設定入口。新增 OWNER 專用的品牌資產簽名／驗證流程，使用獨立 `uploads/brand/` key 前綴；公開設定只接受該流程回傳、驗證過的 URL。

- favicon 與 48px icon：只接受 PNG 來源；前端在上傳前讀取尺寸，要求 1:1；伺服器在儲存設定前以實際檔案內容再驗證 MIME、像素與方形比例。系統產生／提供符合 public 輸出的 `.ico` 與 PNG endpoint。
- logo 與 OG 圖：只接受 JPEG、PNG 或 WebP；檔案上限與既有服務一致（10 MB），伺服器驗證真實內容型別與可解碼尺寸。OG 圖必須滿足最低可用寬高，並在介面提示建議 1200×630。
- 所有文字欄位 trim 後驗證：網站名稱必填且有限長；替代名稱、title 與 description 皆限制合理長度。所有展示位置都以純文字輸出，不接受 HTML。
- 直接 R2 上傳後但未通過驗證的物件不會被設定引用；保留為可清理的 orphan，不覆寫目前生效資產。
- 所有 server action 與上傳 endpoint 都要重新檢查登入、帳號狀態與 `OWNER` 角色；不可只依前端隱藏連結。

## 7. 錯誤處理與可觀測性

- DB 沒有設定、暫時讀取失敗，或設定的資產無法取得時，公開輸出回退到目前程式資產與 dictionary，不能讓 favicon／metadata 變成空白或使公開頁 500。
- 後台在 R2 環境變數遺失、簽名失敗、檔案驗證失敗或 transaction 失敗時顯示可行的錯誤；既有資料保持不變。
- public 品牌 route 對不可用來源使用 fallback，並記錄伺服器端可診斷資訊，但不將 R2 秘密或內部錯誤回傳使用者。
- 以最小必要範圍處理快取；不因修改某一語言的首頁摘要而變更其他語言的內容或 canonical。

## 8. 測試與驗收

新增與調整測試至少覆蓋：

- repository：singleton／locale 設定讀取、每個欄位 fallback、未知 locale 拒絕。
- Prisma migration：首次無設定資料時可正常公開讀取；singleton 與 locale primary key 約束成立。
- authorization：未登入與 EDITOR 無法開啟頁面、呼叫 action 或取得品牌上傳簽名。
- validation：文字長度、空白正規化、假 MIME、非方形 icon、過大或無法解碼圖片都被拒絕；失敗不改變目前設定。
- server action：有效設定以 transaction 寫入、正確 revalidate 所有受影響路徑、失敗不回報成功。
- UI：固定語言分頁來自 `supportedLocales`，切換保留尚未儲存值，預覽與 Google 非保證提示可見。
- public output：三種 locale 的 title／description/OG、`WebSite`／`Organization` JSON-LD、manifest 及固定資產路徑均使用已解析設定；空白語系仍維持 `noindex, follow`；沒有 `hreflang`。
- regression：現有 favicon、manifest、首頁 metadata、structured data、語系與 sitemap 測試全部通過；執行完整 unit suite、lint（區分既有問題）與 production build。

## 9. 發佈與搜尋引擎驗收

1. 部署後確認 `/brand/favicon.ico`、`/brand/icon-48.png`、manifest 與三個首頁都能公開取得並回傳正確 content type。
2. 在各語言首頁檢查 HTML metadata、canonical、`lang`、Open Graph 和 JSON-LD；確認沒有新增 `hreflang`。
3. 以 Google Search Console 重新提交 sitemap／要求檢索重要首頁。Google 是否採用網站名稱、摘要或顯示 sitelinks 仍由它自行決定，通常需要重新抓取與一段觀察期。
4. 定期以品牌詞搜尋檢查實際呈現，不以本機預覽當作 SERP 的保證。

## 10. 實作切分

此設計是一個可連續完成的子系統，而不是語言管理或內容翻譯專案。依序實作：資料 migration 與 repository → OWNER action／上傳驗證 → 後台頁面與導覽 → 公開 metadata／資產 routes → 測試、文件與部署驗收。任何未來「新增語言」仍依既有受控工程流程處理 `supportedLocales`、字典、路由、SEO 與測試，而非擴充本頁面為動態語言管理器。
