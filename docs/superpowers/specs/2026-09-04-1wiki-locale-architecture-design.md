# 1Wiki 多語系內容架構設計

最後更新：2026-09-04

## 1. 目標

1Wiki 的公開內容網址統一包含語系前綴。第一階段預設使用繁體中文，同時開放英文與日文入口；英文與日文在尚未發布內容時顯示各自語言的空白首頁。未來新增其他語系時，應只需擴充集中設定、介面文字及內容，不必重做路由或資料模型。

各語系是彼此獨立的內容站，只共用應用程式、帳號、資料庫及部署基礎設施。不同語系的文章不視為同一篇文章的翻譯版本，也不建立翻譯群組、對應文章或翻譯進度。

## 2. 範圍

本次架構包含：

- 公開網站的語系前綴路由。
- 繁體中文、英文與日文語言選擇器。
- 可擴充的語系集中設定。
- 文章及分類的語系隔離。
- 語系相關的 metadata、canonical、Open Graph、JSON-LD、robots 及 sitemap。
- 後台文章與分類的語系選擇及篩選。
- 現有無語系前綴公開網址的轉址策略。

本次不包含：

- 文章翻譯工作流。
- 不同語系文章之間的自動或人工關聯。
- 跨語系內容同步。
- 自動翻譯。
- 依瀏覽器語言或所在地自動切換語系。

## 3. 語系設定

應以單一伺服器端設定模組管理所有支援語系，不使用 Prisma enum。資料庫保存穩定的路由語系代碼，例如 `zh-tw`、`en`、`ja`；HTML、Open Graph 和日期格式所需的標準代碼由設定映射取得。

第一階段設定如下：

| 路由代碼 | 選單標籤 | HTML `lang` | Open Graph locale | 日期格式 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| `zh-tw` | 繁體中文 | `zh-Hant-TW` | `zh_TW` | `zh-TW` | 可用、預設 |
| `en` | English | `en` | `en_US` | `en` | 可用、空白內容 |
| `ja` | 日本語 | `ja` | `ja_JP` | `ja-JP` | 可用、空白內容 |

語系設定至少提供以下資訊：

- 路由代碼。
- 使用者可見名稱。
- HTML 語言代碼。
- Open Graph locale。
- 日期格式 locale。
- 是否可由使用者選擇。
- 該語系的介面文字與網站 metadata。

未知或未啟用的語系代碼回傳 404，不回退至繁體中文。未來新增語系時，先加入設定與必要介面文字，再開放使用者選擇。

## 4. 公開路由

公開頁面移至單一動態語系區段：

```text
src/app/
├── [locale]/
│   ├── layout.tsx
│   └── (site)/
│       ├── page.tsx
│       ├── articles/[slug]/page.tsx
│       ├── category/[slug]/page.tsx
│       ├── ai/page.tsx
│       ├── software/page.tsx
│       ├── social/page.tsx
│       ├── about/page.tsx
│       ├── contact/page.tsx
│       ├── privacy/page.tsx
│       └── terms/page.tsx
├── admin/
├── login/
├── change-password/
├── sitemap.ts
└── robots.ts
```

主要公開網址：

```text
/zh-tw/
/zh-tw/ai
/zh-tw/articles/{slug}
/zh-tw/category/{slug}
/zh-tw/about

/en/
/en/articles/{slug}

/ja/
/ja/articles/{slug}
```

`/` 使用永久轉址導向 `/zh-tw/`。根網址的行為固定，不依 cookie、瀏覽器語言或 IP 改變，確保使用者及搜尋引擎得到穩定結果。

後台及驗證路由維持 `/admin`、`/login`、`/change-password`，不加語系前綴。`/ads.txt`、`/robots.txt`、`/sitemap.xml`、manifest 與靜態資源也維持根路徑。

## 5. 語言選擇器

公開網站頁首顯示語言選擇器，第一階段包含繁體中文、English、日本語。當前語系須以文字或可存取狀態標示，不能只靠顏色區分；鍵盤操作與螢幕閱讀器必須可辨識。

切換規則：

- 在任何頁面選擇目前語系，不重新導覽。
- 從繁體中文文章或分類頁選擇英文或日文時，導向目標語系首頁。
- 不根據相同 slug 猜測另一語系是否存在對應內容。
- 在首頁切換語系時，直接導向目標語系首頁。
- 語言選擇器使用一般可索引連結，不依賴 JavaScript 才能導覽。

不保存使用者偏好來改變根網址的預設轉址。使用者可透過已選語系的書籤或瀏覽器歷史直接返回該語系。

## 6. 空白語系行為

英文與日文沒有已發布文章時，仍可進入 `/en/` 與 `/ja/`，並以相應語言顯示清楚的內容準備中狀態。這些頁面使用完整網站框架及語言選擇器，但不顯示繁體中文文章、分類內容或假資料。

一個語系在沒有任何已發布內容時：

- 語系首頁輸出 `noindex, follow`。
- 不加入 sitemap。
- 不產生不存在的文章或分類頁面。

當該語系至少有一篇已發布文章後：

- 首頁可被索引。
- 該語系的實際公開頁面加入 sitemap。
- `noindex` 判斷由資料狀態決定，不需另行部署開關。

## 7. 資料模型

`Post` 與 `Category` 都新增 `locale` 字串欄位。既有資料 migration 統一填入 `zh-tw`，欄位在回填後設為必填。

核心約束：

```prisma
model Category {
  id     String
  locale String
  slug   String
  posts  Post[]

  @@unique([id, locale])
  @@unique([locale, slug])
}

model Post {
  id         String
  locale     String
  slug       String
  categoryId String
  category   Category @relation(fields: [categoryId, locale], references: [id, locale])

  @@unique([locale, slug])
  @@index([locale, status, publishedAt])
}
```

相同 slug 可以存在於不同語系，但同一語系內仍必須唯一。文章與分類使用包含 `locale` 的複合外鍵，讓資料庫保證文章只能選擇相同語系的分類；服務層仍提供易懂的驗證錯誤，不能只依賴後台選單過濾。

所有公開內容查詢都必須同時包含 `locale` 與 `slug` 或 `locale` 與發布狀態，不得再以全站 slug 單獨查詢。分類列表、最新文章、文章頁、分類頁、sitemap 與 metadata 查詢均遵守同一規則。

## 8. 介面文字與內容

網站框架文字集中於型別化的語系字典，包括：

- 導覽與頁尾。
- 首頁標題及空白狀態。
- 麵包屑及文章日期標籤。
- 分類頁空白狀態。
- 語言選擇器的可存取標籤。
- 網站名稱、描述與預設社群分享文字。

字典缺少必要 key 時應在開發或建置階段失敗，不在正式環境靜默回退至繁體中文。文章、分類及各語系特有的內容保存在資料庫，不放入共用介面字典。

政策頁與資訊頁的內容可以先以各語系獨立的程式模組維護；未提供英文或日文版本時，應顯示相應語言的未提供狀態，而不是顯示繁體中文版本。若未來需要由後台編輯，再獨立規劃頁面內容模型。

## 9. SEO 與結構化資料

每個公開頁面根據路由語系產生：

- `<html lang>`。
- canonical URL。
- Open Graph locale。
- JSON-LD `inLanguage`。
- 語系對應的日期格式。
- 語系對應的網站名稱及描述。

繁體中文文章 canonical 範例：

```text
https://1wiki.org/zh-tw/articles/example
```

不同語系內容不是互譯版本，因此不產生跨語系 `hreflang` 或 `alternates.languages`。各頁只提供自身 canonical。語言選擇器連結不代表搜尋引擎的翻譯對應關係。

Sitemap 只包含有實際可索引內容的語系及其已發布頁面。空白語系首頁、草稿、後台及驗證路由不列入 sitemap。

## 10. 後台流程

後台新增語系維度：

- 文章列表提供語系篩選。
- 分類列表提供語系篩選。
- 新增文章與分類預設選擇 `zh-tw`。
- 編輯器提供可選語系，但分類選單只顯示相同語系的分類。
- 改變文章語系時必須重新驗證 slug 唯一性及分類相容性。
- 已發布文章不直接更改語系；需要變更時，建立另一語系的新文章，以免既有公開網址改變意義。
- AI 生成及改寫提示詞必須接收目標語系，不再固定要求繁體中文。

第一階段即顯示語系欄位，讓英文與日文內容可隨時建立，不需要等待第二次後台改版。

## 11. 舊網址遷移

現有無語系前綴的公開網址永久轉址至繁體中文對應網址：

```text
/ai                  → /zh-tw/ai
/software            → /zh-tw/software
/social              → /zh-tw/social
/articles/{slug}     → /zh-tw/articles/{slug}
/category/{slug}     → /zh-tw/category/{slug}
/about               → /zh-tw/about
/contact             → /zh-tw/contact
/privacy             → /zh-tw/privacy
/terms               → /zh-tw/terms
```

轉址必須保留 query string。後台、驗證、SEO 系統檔案及靜態資源不可被這組規則攔截。部署前應確認沒有轉址迴圈，並驗證既有文章 slug 含非 ASCII 字元時仍能正確解析。

## 12. 錯誤處理

- 未支援的語系回傳 404。
- 受支援語系下不存在的文章或分類回傳 404，不回退到其他語系。
- 語系與分類不一致時，後台儲存失敗並提供明確錯誤訊息。
- 同語系 slug 衝突時，沿用可理解的 slug 已使用錯誤；不同語系的相同 slug 不視為衝突。
- 語系設定或必要字典資料不完整時，在測試或建置階段失敗。

## 13. 測試與驗收

單元及整合測試至少涵蓋：

- 語系代碼驗證與設定映射。
- 不同語系允許相同 slug，同語系拒絕重複 slug。
- 文章不能使用另一語系的分類。
- 所有 repository 公開查詢均隔離語系。
- metadata、canonical、Open Graph 及 JSON-LD 使用正確語系與網址。
- 空白語系首頁為 `noindex` 且不進入 sitemap。
- 語系發布第一篇文章後開始產生可索引首頁及 sitemap 項目。

端對端測試至少涵蓋：

- `/` 永久轉址到 `/zh-tw/`。
- 舊公開網址永久轉址到 `/zh-tw/...` 並保留 query string。
- 語言選擇器可從繁體中文頁進入英文及日文首頁。
- 英文與日文空白首頁不顯示繁體中文內容。
- 從文章頁切換語系時進入目標語系首頁。
- 無效語系及跨語系 slug 存取回傳 404。
- `/admin`、`/login`、`/ads.txt`、`/robots.txt` 及 `/sitemap.xml` 不受語系轉址影響。
- `360`、`390`、`768` 與 `1280` px 寬度下語言選擇器可操作且不破壞現有導覽。

## 14. 實作順序與發布原則

建議依以下順序實作：

1. 建立語系設定、介面字典及驗證函式。
2. 新增資料庫欄位、複合唯一約束與既有資料回填 migration。
3. 將 repository 查詢與後台表單改為語系感知。
4. 搬移公開路由至 `[locale]` 並加入語言選擇器及空白首頁。
5. 調整 metadata、JSON-LD、sitemap、robots、manifest 及舊網址轉址。
6. 完成單元、整合及端對端回歸。

所有修改先在本機完成並通過適用測試、lint、production build 及端對端測試。在專案負責人明確確認前，不部署至 Vercel、不修改遠端資料庫，也不更新正式環境變數。

## 15. 完成條件

本架構完成時應符合：

- 繁體中文內容只出現在 `/zh-tw/...`。
- 英文與日文可以由語言選擇器進入獨立空白首頁。
- 新增語系不需重構公開路由或資料表。
- 不同語系的內容、slug、分類、SEO 與 sitemap 完全隔離。
- 現有公開網址有穩定永久轉址，後台及系統路徑維持原狀。
- 沒有內容的語系不被搜尋引擎索引，也不混用繁體中文內容。
