# 1Wiki AdSense 覆蓋式廣告格式設計

最後更新：2026-09-09

文件狀態：歷史 AdSense 覆蓋式廣告設計規格；現況以 [工作狀態](../../project-status.md) 為準。

## 目標

在維持 1Wiki 閱讀體驗與既有手動文章／列表廣告的前提下，加入接近 How-To Geek 的 AdSense 可支援版型：桌面側欄黏附廣告，以及由 AdSense Auto ads 管理的可關閉 Anchor ad。右下浮動影音不納入本階段。

## 範圍與非目標

本階段涵蓋公開文章、首頁與分類頁的 AdSense 載入條件、OVERLAY 類型開關、OWNER 後台設定與快取失效。

不實作自建 fixed 728×90／970×90 banner、自建手機浮動矩形廣告、右下影片播放器、Vignette，以及 Mediavine／Google Ad Manager／其他第三方廣告需求來源。

## 廣告格式與設備規則

| 格式 | PC（>=1280px） | iPad（768–1279px） | Mobile（<768px） |
| --- | --- | --- | --- |
| 手動內文／列表廣告 | 啟用既有 placement | 啟用既有 placement | 啟用既有 placement |
| 桌面側欄 Sticky | 一個寬度 <=300px 的 rectangle | 不顯示 | 不顯示 |
| Anchor ad | 可由 AdSense Auto ads 顯示 | 可由 AdSense Auto ads 顯示 | 可由 AdSense Auto ads 顯示 |
| 右下浮動影音 | 不支援 | 不支援 | 不支援 |

中段廣告仍由現有 H2 規則控制；首篇和自動續載文章共用同一設定。Anchor ad 是頁面層級而非文章層級，每個文件只載入一次，連續續載不新增第二個 Anchor。

## AdSense 整合方式

`AdsenseScript` 在公開且已啟用廣告的文章、首頁、分類頁輸出 Auto ads 設定。當 OWNER 開啟 Anchor ad 時，透過 `adsbygoogle.js` 的 `enable_page_level_ads` 設定要求 Google 投放；實際是否顯示、尺寸、位置與關閉控制由 Google 決定。

不以 CSS 對 AdSense `<ins>` 做 fixed 定位。手動黏附只維持現有桌面側欄 rectangle，並限制一個可見單元與 >=1280px 斷點。

## OWNER 後台設定

`/admin/ads` 新增 Overlay Ads 區塊：

- `anchorAdsEnabled`：是否允許 AdSense Auto ads Anchor ad，預設關閉。
- `anchorAdsOnArticles`、`anchorAdsOnHome`、`anchorAdsOnCategories`：可投放頁型，皆預設開啟，但僅在總開關啟用後生效。

設定儲存時驗證 OWNER 身分，重新驗證相關公開 path 與管理頁。資料庫既有 `ArticleAdSetting` 擴充欄位並以 migration 保存。

## 失敗與安全行為

- 沒有 client ID、未啟用 AdSense、非公開路由或 OWNER 關閉時，不輸出 Auto ads 設定。
- 開發環境保留既有手動 placement 預覽，但不模擬固定 Anchor ad。
- 舊 Prisma client 或未完成 migration 時，後台顯示明確就緒提示並停用儲存，不暴露 runtime error。
- `adsbygoogle.push` 失敗不得中斷頁面閱讀。

## 驗證

- 單元測試：設定解析、頁型與環境 gate、一次性初始化。
- 元件測試：文章首篇和續載文章不重複輸出 Anchor 設定；非允許頁型無設定。
- OWNER action／頁面測試：權限、預設值、儲存、快取失效。
- 瀏覽器驗證：PC、iPad、mobile 下確認手動側欄只在 PC，Anchor 由 Google 控制且不與自建 sticky 疊加。
