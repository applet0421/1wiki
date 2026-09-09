# 同分類文章連續閱讀

最後更新：2026-09-09

文件狀態：現行操作文件。文章與分類功能已提交；首頁共用文章流與首頁手動廣告目前仍在工作樹中，完成狀態以 [工作狀態](project-status.md) 為準。

文章頁距離載入區約 600px 時，自動在原文下方接上一篇完整文章。各篇之間顯示點狀分隔帶，沿用文章標題、麵包屑、作者、正文、分類入口與廣告版位。窄螢幕沿用單欄版面。

## 選文與狀態

- 僅選取原文章相同語系、相同 categoryId 的已發布文章，不涵蓋子分類。
- 排除原文章、草稿、尚未到發布時間或沒有發布時間的文章。
- 其他文章依 publishedAt、id 由新到舊接續；相同發布時間亦有穩定排序。
- 每次只載入一篇，防止並行請求與重複文章；沒有更多文章時停止觀察並顯示結束文字。
- 失敗後保留內容，改由使用者按「重試載入」；無 IntersectionObserver 時仍可按按鈕載入。
- 不變更目前網址、頁面標題或 canonical；接續文章標題連至各自的文章頁。初始文章仍由伺服器輸出，保留原有 SEO metadata 與 JSON-LD。

## 實作

`ArticlePanel` 共用伺服器端文章呈現；`ArticleFeed` 處理捲動、載入及重試。公開 Server Function `loadNextArticle` 驗證輸入，從已發布的原文章取得分類，查詢並傳回下一篇的伺服器渲染內容。正文切段留在伺服器，不傳送資料庫模型內部欄位給前端。

## 驗證

```sh
npm test -- src/lib/content/next-article.test.ts src/components/site/article-feed.test.tsx src/components/site/article-body.test.tsx src/components/site/category-breadcrumbs.test.tsx src/components/ads/ad-slot.test.tsx src/lib/seo/metadata.test.ts src/lib/seo/structured-data.test.ts
npx tsc --noEmit
```

資料庫測試使用獨立的本機 PostgreSQL 測試資料庫，資料夾具在 transaction 結束時回滾。涵蓋相同時間排序、原文排除、跨語系／分類排除、草稿／未來發布排除與耗盡狀態。元件測試涵蓋接近底部載入、避免並行請求、重試與重複回應。

瀏覽器已確認指定文章頁自動接上「品牌如何讓AI推薦自己：從零開始的實作指南」，繼續捲動至末端顯示「已讀完此分類的其他文章」。

## 側欄廣告與延後載入（2026-09-08）

首篇與往下自動載入的每篇續文使用相同廣告配置：`article_after_intro`、依 H2 區段插入的 `article_mid`、`article_end`，以及一個桌面側欄版位。只有可見內文至少 1,200 字元時才插入中段廣告，且不會插在最後一個 H2 區段後方。唯一的 `sidebar_desktop_sticky` 黏附於距視窗頂端 6rem 處，並受該篇側欄容器限制；視窗高度不超過 440px 時取消黏附。

OWNER 可在 `/admin/ads` 設定中段廣告節奏：每 1–6 個 H2 插入一則、每篇最多 0–5 則；預設為每 2 個 H2、每篇最多 3 則。設定變更會重新驗證各語系公開 layout，首篇與後續自動載入文章會在下一次渲染時共同採用新規則。

文章版面與側欄顯示斷點統一為 1280px；寬度不足時改為單欄，側欄廣告不顯示也不初始化，不保留空白欄位。全部正式廣告在各自容器距視窗下緣 300px 內時才插入 AdSense 元素並初始化一次；預覽框維持顯示，保留版面高度。連續閱讀帶入新文章時，不會一次初始化整篇的所有廣告。缺少 IntersectionObserver 的瀏覽器退回一般初始化，但仍遵守桌面側欄限制。

正式廣告容器會顯示低對比的「AD」標示，並監聽 AdSense 的 `data-ad-status`。`filled` 正常顯示；`unfill-optimized` 保留給 AdSense 管理；`unfilled` 若已在視窗內，會等離開可視範圍後再收合，否則立即移除預留高度與間距，避免留下大片空白。

唯一側欄版位使用環境變數 `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP_STICKY`。正式環境必須填入有效 slot ID 並啟用 AdSense 才會投放；未設定時不顯示，本機開發環境顯示預覽框。舊的 `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP` 已移除。

## Google 底部 Anchor（2026-09-08）

`/admin/ads` 的 OWNER 設定新增總開關與文章、首頁、分類頁三個顯示開關，預設總開關關閉。啟用後僅在已啟用 AdSense 且具有有效 publisher client ID 的對應公開頁，輸出 Google Auto ads 的 `data-overlays="bottom"`；Google 負責裝置相容性、顯示與關閉控制。沒有自建 fixed `<ins>`、Vignette 或浮動影音廣告。

文章首篇最多輸出一次 page-level AdSense script；往下自動載入的續篇只保留既有內文與側欄手動版位，不會重新設定 Anchor 或插入第二份 script。公開 layout 不再對所有路由載入 AdSense，因此後台、登入、政策及其他非目標頁不會初始化 Anchor。

## 分類列表載入與卡片（2026-09-06 盤點）

分類頁另使用 `CategoryArticleList`，接近底部 500px 時呼叫 `/api/categories/posts`，以 locale、分類 path、offset 分批載入，每批 10 筆；結束時顯示「已載入全部文章」。這個列表並非上述文章正文連續閱讀元件，尚沒有相同的手動重試／無 IntersectionObserver 按鈕備援。

分類頁暫停顯示 `category_after_intro` 頂部廣告。`category_inline` 的間隔改由 OWNER 在 `/admin/ads` 設定，可填 4–20、預設 10；只有間隔位置之後已載入至少一篇文章時才插入，例如預設值下剛好 10 篇不顯示，第 11 篇載入後才在第 10 篇後顯示。原本的 `NEXT_PUBLIC_CATEGORY_INLINE_AD_INTERVAL` 已移除，避免與後台形成兩套設定來源。

分類頁各裝置版位狀態：

| 視窗寬度 | 頂部 | Inline | 列表結尾 | 側欄 |
| --- | --- | --- | --- | --- |
| ≤900px | 停用 | 依後台間隔、有後續文章才顯示 | 至少 4 篇時顯示 | 隱藏 |
| 901–1279px | 停用 | 依後台間隔、有後續文章才顯示 | 至少 4 篇時顯示 | 隱藏 |
| ≥1280px | 停用 | 依後台間隔、有後續文章才顯示 | 至少 4 篇時顯示 | 顯示 Desktop Sticky |

上述手動版位仍需對應的 `NEXT_PUBLIC_ADSENSE_SLOT_CATEGORY_*` slot ID；正式環境未啟用 AdSense 或未設定 slot 時不會投放。分類頁 Bottom Anchor 則由同一後台的 Anchor 總開關與分類頁開關獨立控制。

共用文章卡片已支援封面，封面上傳及補值規則見 [文章編輯與媒體](article-editing.md)。本次只重跑卡片等聚焦測試，歷史瀏覽器紀錄保留原有適用範圍，詳見 [測試紀錄](test-log.md)。

## 首頁文章流（2026-09-09 進行中）

首頁目前工作樹改為重用 `ArticleFeedList` 與分類卡片樣式，最多顯示既有查詢回傳的 12 篇最新文章。`home_inline` 沿用 OWNER 的 `categoryInlineAdInterval`，同樣只有間隔位置後方仍有文章時才插入；`home_end` 位於列表結尾，`home_sidebar_desktop` 只在 ≥1280px 顯示及初始化。

首頁不新增頂部手動廣告；Bottom Anchor 仍由 `/admin/ads` 的總開關與首頁開關控制。對應環境變數為 `NEXT_PUBLIC_ADSENSE_SLOT_HOME_INLINE`、`NEXT_PUBLIC_ADSENSE_SLOT_HOME_END`、`NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR_DESKTOP`。這些變更尚待本輪全量測試、Build 與瀏覽器斷點驗收，不能視為已發布。
