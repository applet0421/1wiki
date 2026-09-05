# 目前工作狀態

最後更新：2026-09-06

本文件以本機 Git HEAD `d5f0074`（盤點開始時為 `5339e2e` 加未提交程式，期間由其他工作流程提交）為基準。這是程式與文件盤點，不代表正式環境已啟用；本次未部署、執行 migration、操作外部帳戶或呼叫付費服務。

## 功能與文件入口

| 項目 | 目前狀態 | 文件 |
| --- | --- | --- |
| 多語系、三級分類、文章後台、AI 初稿與 Prompt／用量管理 | 已有實作；既有設計與計畫保留歷史要求 | [README](../README.md) |
| 作者庫、封存／恢復、作者頁及署名 | 已提交實作 | [作者庫](author-library.md) |
| GA4 追蹤與 OWNER 流量監測 | 已提交實作；外部設定與資料同步狀態本次未查核 | [流量監測](traffic-monitoring.md) |
| AI 配圖、上傳復原、Worker 監控與控制 | 已提交實作；範例環境與程式預設值不同 | [AI 配圖](ai-article-images.md) |
| 文章連續閱讀、分類頁載入更多、延後載入廣告 | 已提交實作 | [連續閱讀](article-auto-loading.md) |
| 文章卡片封面與 YouTube Shorts | 已提交於 `5339e2e` | [編輯與媒體](article-editing.md) |
| 封面 R2 上傳、發布時正文首圖補封面 | 已提交於 `d5f0074`；完整儲存／上傳整合驗證待執行 | [編輯與媒體](article-editing.md) |
| Bing IndexNow 通知佇列、OWNER 後台、處理 API | 已提交部分實作於 `d5f0074`；尚未達可發布條件 | [搜尋引擎通知](search-engine-submission.md) |

## 搜尋引擎功能待完成

- 處理入口只匯出 POST，需接妥 Cron 呼叫方式；確認兩個 secret 的優先順序。
- 文章保存與通知 upsert 尚未放入同一交易；通知寫入失敗可能在文章已保存後顯示儲存失敗。
- 補上原子 claim、有限次數重試、永久失敗、過期清理及併發時新事件不被舊批次覆蓋的保護。
- canonical 現採字串前綴判斷；發布時間、刪除事件、slug 變更前的舊 URL 尚待完整處理。
- 提供 IndexNow key 驗證檔案；尚未實作 `INDEXNOW_KEY_LOCATION`。
- 補上資料庫、HTTP 成功／失敗、完整流程及真實 sitemap／key location 驗證。

## 資料庫與發布

目前 migration 包含多語系、Prompt／用量、AI 配圖、Worker 心跳、作者庫及 GA4；最新新增檔案為 `prisma/migrations/20260906120000_search_engine_notifications/migration.sql`。migration 檔存在不代表任何環境已套用。

發布前先完成適用的隔離資料庫回歸、型別檢查與 production build，確認 migration 與環境設定，再依 README 的發布政策取得確認。搜尋引擎功能應先完成上列缺口再啟用排程。

## 本次驗證

[測試紀錄](test-log.md) 記錄 6 個測試檔／18 項測試通過、lint 0 errors／1 warning。未重跑完整測試、TypeScript、production build、E2E 或外部整合；歷史文件中的通過數字僅代表當時版本。

本次相關文件同步不涉及 Meta Creator Marketplace Phase 1；本儲存庫未找到該功能的 PRD、測試紀錄或 API 能力文件。
