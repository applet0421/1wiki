# 數據庫資料保留與清理設計

最後更新：2026-09-06

## 目標

為會持續新增、但不需要永久保存的執行紀錄建立可設定的保留期限，降低 PostgreSQL 資料量與索引膨脹風險，同時保留異常排查與核心內容資料。

清理由既有 `database-backup-worker` 每日執行，不新增常駐服務。清理工作必須可重複執行、分批處理，且不影響備份流程或網站請求。

## 範圍與保留規則

管理者可在 `/admin/database-backups` 設定下列天數。設定值代表以資料的主要建立時間為基準，保留最近 N 天；最小值為 1，最大值為 3650。

| 資料 | 預設保留 | 清理條件 |
|---|---:|---|
| LLM 用量 | 180 天 | 依 `createdAt` 清理成功與失敗紀錄 |
| 流量頁面明細 | 365 天 | 依 `date` 清理 `TrafficDailyPage` |
| 流量網站彙總 | 730 天 | 依 `date` 清理 `TrafficDailySite` |
| 流量同步執行紀錄 | 180 天 | 只清理已完成的 `SUCCESS`／`FAILURE`，不清理 `RUNNING` |
| 搜尋引擎成功通知 | 90 天 | 只清理 `SUCCESS` |
| 搜尋引擎失敗通知 | 365 天 | 只清理 `FAILED`；`PENDING` 不自動刪除 |
| AI 配圖任務 | 90 天 | 只清理終態任務；有 `imageBytes` 的失敗／未知任務需額外保護 |
| 快取失效事件 | 180 天 | 只清理 `FAILED`；成功事件已於完成後刪除，`PENDING` 不自動刪除 |
| 過期登入 Session | 立即 | 清理 `expiresAt < now()` 的資料 |
| 備份失敗／卡住紀錄 | 30 天 | 清理 `FAILURE`，以及超過期限的 `RUNNING`；成功備份維持既有數量保留 |

不清理 `Post`、`SitePage`、`Category`、`Author`、`PromptDefinition`、`PromptVersion` 與 `LLMModelPrice`，因為這些是內容、設定或審計歷史資料。

## 資料模型

新增單例設定表 `DataRetentionSetting`，使用固定 id `default`，每個清理類別一個整數天數欄位。欄位採明確名稱，不使用 JSON，讓 validation、migration 與 SQL 清理條件可檢查。

設定頁沿用現有備份設定的 OWNER 權限與 Server Action。讀取設定時使用 upsert 建立預設值；儲存前驗證整數範圍，成功後 revalidate 頁面。

## 清理流程

新增可獨立測試的 `runDataRetentionCleanup(client, now)`，由 `database-backup-worker` 在每日排程成功或完成處理後呼叫。

每類資料使用單獨的 `deleteMany`，條件包含：

- 截止時間為 `now - retentionDays`。
- 僅包含允許清理的狀態。
- 不使用未解析的全表讀取或逐筆刪除。
- 每類回傳刪除筆數，組合成清理摘要。

為避免一次操作造成負載，第一版以每類一次 `deleteMany` 為主；若正式資料量已證實很大，再增加批次 id 清理。清理例外需記錄到 Worker heartbeat 的 `lastError`，但不可讓備份 Worker 因單一清理類別失敗而中止。

## 大型資料保護

`ImageGeneration.imageBytes` 是目前最可能造成單筆資料膨脹的欄位。READY 任務上傳完成後必須維持 `imageBytes = null`；清理程序不刪除仍為 `UNKNOWN` 或有待重試上傳內容的資料。超過設定期限的這類資料先保留並產生告警，不自動刪除。

## 觀測與驗證

Worker 每日輸出各類清理筆數與總數；管理頁顯示目前設定與最後清理摘要（若現有 heartbeat 欄位不足，先以 worker log 為主，不擴張監控資料模型）。

測試涵蓋：預設值與範圍驗證、各資料表的狀態／日期條件、保護中的狀態不被刪除、清理結果摘要，以及清理失敗不阻斷備份流程。migration 與 TypeScript、lint、相關 Vitest 測試需通過。

## 不在本次範圍

- 不刪除既有核心內容或 Prompt 版本。
- 不立即執行正式資料庫的歷史清理；部署後由 Worker 依設定自然清理。
- 不改變 R2 備份檔的既有保留數量規則。
- 不新增資料庫外部排程服務。
