# 搜尋引擎通知與設定

最後更新：2026-09-06

狀態：本機部分實作，尚未完成發布驗收。以下分別記錄現有行為與待完成設定；尚未操作 Google、Bing、Vercel 或遠端資料庫。

## 已有程式能力

- 動態 `/sitemap.xml` 提供各語系文章、分類、已公開資訊頁與作者頁。文章／分類查詢目前僅依 PUBLISHED 篩選；作者頁另檢查發布時間。尚未統一未來發布時間與 canonical 排除規則。
- 新 migration `20260906120000_search_engine_notifications` 建立通知表，保存 URL、引擎、事件、狀態、嘗試次數、下次時間、最後錯誤與送出時間，以 `(engine, url, eventType)` 唯一鍵 upsert。
- 文章保存與切換狀態後產生 `publish`、`update`、`unpublish`；canonical 空白或以本站網址開頭才入列。通知寫入在保存交易之外。
- OWNER 可開啟 `/admin/search-engine` 查看待處理／成功／失敗數量、最近 20 筆紀錄及「立即處理通知」。Sitemap「可用」是固定文字，並非 HTTP 健康檢查；資料庫摘要查詢例外目前回傳零值。
- `POST /api/internal/search-engine/process` 每次讀取最多 100 筆已到期的 Bing PENDING 通知，送往 IndexNow；成功標為 SUCCESS，失敗保留 PENDING、記錄錯誤並延後固定五分鐘。
- 缺金鑰、站點網址或空批次時跳過提交。API 回傳 `summary`（選取筆數）、`success`（送出筆數）、`failure`（失敗筆數）；跳過時不能僅憑 failure=0 判定已送達。未授權為 401，提交例外為 502；資料庫讀取例外尚不在統一回應範圍內。

## 環境設定與目前限制

| 變數 | 實際用途 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 本站公開根網址與 IndexNow host |
| `INDEXNOW_KEY` | 提交金鑰；目前只送 host、key、urlList |
| `SEARCH_ENGINE_CRON_SECRET` | 內部 API bearer secret，優先於 CRON_SECRET |
| `CRON_SECRET` | API secret 備援；使用 Vercel Cron 時需確認與 API 預期一致 |

`vercel.json` 已寫入每五分鐘排程，但 route **只提供 POST**。[Vercel Cron 文件](https://vercel.com/docs/cron-jobs) 說明排程以 GET 呼叫，故目前不能把此設定視為可運作排程。

[IndexNow 文件](https://www.indexnow.org/documentation) 要求公開 key 驗證檔案；目前沒有自動提供根目錄 key 檔案，也不讀取計畫中的 `INDEXNOW_KEY_LOCATION`。啟用前需完成這部分。

待補實作：原子 claim、退避上限／最大次數、4xx 永久失敗、過期清理、正確同源 canonical 比對、未來發布排除、刪除／改 slug 的舊 URL 通知，以及保存與 enqueue 的交易一致性。現有程式沒有寫入 FAILED 狀態的路徑。

手動處理不檢查 `nextAttemptAt`，失敗也沒有與排程相同的錯誤持久化；成功 redirect 位於 try/catch 內，存在被 catch 當成錯誤重新導向的風險，待 action 回歸確認。

## Google 與 Bing 上線設定手冊（待執行）

1. 確認正式 `NEXT_PUBLIC_SITE_URL`，以規劃中的 `https://www.1wiki.org` 為例，在 Google Search Console 與 Bing Webmaster 驗證對應網站資源，提交 `https://www.1wiki.org/sitemap.xml`。
2. 檢查 sitemap、robots 與公開文章實際回應、canonical、DNS 及 HTTPS。此次未檢查正式站可用性或帳戶驗證狀態。
3. Google 一般教學文章以 sitemap 與公開連結供發現；目前沒有 Search Console API 串接。[Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api) 僅適用 JobPosting 或特定直播影片頁，不能用來實作本站一般文章即時索引。
4. 補齊 IndexNow key 公開檔案、上述程式缺口，完成隔離資料庫 migration 與回歸，再依 README 發布政策安排啟用。

## 故障定位與驗證

- sitemap 非 200：檢查路由、資料庫連線、站點網址；URL 缺漏時檢查語系、發布狀態及分類／作者關聯。
- URL 未索引：檢查 robots、canonical、頁面回應與搜尋平台報告；通知成功不等於已索引。
- 401：檢查 bearer header 與 secret 優先順序；405：檢查 GET／POST 不相容。
- 429／5xx／其他非成功回應：目前都會固定五分鐘重試，沒有永久失敗分流。
- 面板全為零但有資料：先查 migration 與資料庫錯誤，摘要函式目前會吞掉例外。

本次只驗證事件分類與 payload 建立，以及後台導覽等相關單元測試；尚未完成 outbox 到 HTTP 的 smoke test。執行命令與結果見 [測試紀錄](test-log.md)；機器可讀紀錄為 [search-engine-smoke.summary.json](search-engine-smoke.summary.json)，其 scope 為 local-unit-and-lint，不能作為端到端或外部提交通過證明。
