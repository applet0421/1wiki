# 流量監測與 GA4 設定

最後更新：2026-09-09

文件狀態：現行操作文件；本次依程式碼校正為累計頁面瀏覽量模型，未連線 GA4 或確認正式同步狀態。

後台 `/admin/traffic` 使用 GA4 Data API 的全期間頁面資料，顯示累計頁面瀏覽量、熱門分類與熱門文章。資料庫不保存每日趨勢、活躍使用者、工作階段、互動率或平均互動時間。

## 必要設定

1. 建立 GA4 Web 資料串流並取得 `G-` 開頭的 Measurement ID。
2. 在 Google Cloud 啟用 Google Analytics Data API。
3. 建立 Service Account，將該帳號加入 GA4 資源並授予 Viewer 權限。
4. 在 GA4 建立事件範圍自訂維度：`page_type`、`locale`、`content_slug`、`category_slug`、`root_category_slug`。
5. 關閉 Enhanced Measurement 的「Page changes based on browser history events」，避免和系統手動送出的 SPA `page_view` 重複計算。

```env
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_EMAIL=analytics-reader@example.iam.gserviceaccount.com
GA4_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA4_SYNC_SECRET=
```

正式環境才會載入 GA4。後台、登入頁與本機開發環境不會送出瀏覽事件。

## 目前 GA4 資源

目前 Google Analytics Web 資料串流提供的 Measurement ID 為 `G-VEWVF1LT1S`，Property ID 為 `552953702`。Measurement ID 已寫入本機未追蹤的 `.env`；正式部署至 Coolify 時，請在該 resource 的 Environment Variables 設定相同的 `NEXT_PUBLIC_GA4_MEASUREMENT_ID`。Property ID 可設定為 `552953702`。

GA4 Data API 的 OWNER 流量同步仍需要另外建立 Service Account，並填入 `GA4_SERVICE_ACCOUNT_EMAIL`、`GA4_SERVICE_ACCOUNT_PRIVATE_KEY` 與 `GA4_SYNC_SECRET`；這些值不寫入 Git，也不放入瀏覽器端。僅設定 Measurement ID 只會啟用前台收集，不會自動讓 `/admin/traffic` 取得報表。

## 同步

OWNER 可在流量監測頁按「立即同步 GA4」。目前 API 每次查詢 `2020-01-01` 到執行當天，依去除 query string 的 `pagePath` 彙總 `screenPageViews`，再 upsert 每個頁面的目前累計值。排程服務可對 `/api/admin/traffic/sync` 發送 `POST`，並帶上 `Authorization: Bearer <GA4_SYNC_SECRET>`。

目前沒有增量同步或日期趨勢需求；可依營運需要安排每小時或每日執行。系統只保存每個 page path 的累計值與同步執行紀錄，不保存 IP 或可識別個人的訪客資料。

## 目前實作與驗證範圍

需先套用 `20260906001000_traffic_analytics` 與 `20260906210000_simplify_traffic_totals`；後台只允許 OWNER，支援語系篩選，不再提供日期篩選。上面的同步頻率是操作建議，目前 `vercel.json` 只有尚待接妥的搜尋引擎排程，沒有 GA4 自動同步排程。

目前 page context 依網址分類首頁、分類、文章、作者與靜態頁。文章路由只填 content slug，不填 category slug／root category slug；熱門分類不可解讀為已完整彙總文章所屬分類。連續閱讀不改網址，因此也不能直接當作每篇載入文章都有獨立 page_view。

本次依程式碼盤點，未連線 GA4、確認資源權限或重跑 GA4 整合測試；最新驗證範圍見 [測試紀錄](test-log.md)。
