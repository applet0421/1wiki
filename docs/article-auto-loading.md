# 同分類文章連續閱讀

最後更新：2026-09-05

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

## 側欄廣告與延後載入（2026-09-05）

桌面每篇文章提供兩個側欄版位：`sidebar_desktop` 正常捲動；`sidebar_desktop_sticky` 在第一個下方保留 4rem 間距，黏附於距視窗頂端 6rem 處，受該篇側欄容器限制。視窗高度不超過 440px 時取消黏附。寬度不足 1024px 時兩個側欄廣告不顯示，也不初始化。

全部正式廣告在各自容器距視窗下緣 300px 內時才插入 AdSense 元素並初始化一次；預覽框維持顯示，保留版面高度。連續閱讀帶入新文章時，不會一次初始化整篇的所有廣告。缺少 IntersectionObserver 的瀏覽器退回一般初始化，但仍遵守桌面側欄限制。

第二個版位使用獨立環境變數 `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP_STICKY`。正式環境必須填入有效 slot ID 並啟用 AdSense 才會投放；未設定時不顯示，本機開發環境顯示預覽框。既有側欄 slot 設定沿用原值。
