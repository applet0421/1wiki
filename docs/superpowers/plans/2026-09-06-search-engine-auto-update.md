# Search Engine Auto Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 1Wiki 在文章發布、更新與下架時，自動讓 Google Search Console 與 Bing Webmaster 取得最新可索引網址。

**Architecture:** 保留目前動態 `/sitemap.xml` 作為 Google 與 Bing 的完整網址目錄；Google 只做一次 sitemap 註冊與必要的 sitemap API 更新，不把不適用一般文章的 Google Indexing API 當成即時索引工具。Bing 使用 IndexNow，在每次內容狀態變更後送出文章 URL，並以可重試的 outbox/工作程序避免發布流程被第三方 API 阻塞。

**Tech Stack:** Next.js 16 App Router、Prisma/PostgreSQL、Vercel Cron 或既有 worker、Google Search Console API、Bing IndexNow API。

**Spec:** 本計畫依現有 `src/app/sitemap.ts`、`src/app/robots.ts`、文章發布 Server Actions 與 `README.md` 的部署限制執行。

## Global Constraints

- 只處理 `PUBLISHED` 且 `publishedAt <= now` 的公開網址。
- 不在本機或未經負責人確認的情況下操作 Vercel、遠端資料庫或搜尋引擎帳戶。
- Google 一般文章不使用 Google Indexing API 要求即時索引；以 sitemap、canonical 與 Search Console 監控為準。
- 第三方 API 失敗不得讓文章發布失敗；必須保留 `summary` / `success` / `failure` 可回歸資訊。
- 每次文件更新都要更新「最後更新」日期，並同步記錄對應命令或用例。

---

### Task 1: 定義搜尋引擎提交資料模型與可索引 URL

**Files:**
- Create: `src/lib/search-engine/indexable-url.ts`
- Test: `src/lib/search-engine/indexable-url.test.ts`

- [ ] 建立 `getIndexableUrl(siteUrl, locale, slug)`、`isIndexablePost(post, now)` 與變更類型 `publish | update | unpublish`。
- [ ] 測試草稿、未到發布時間、錯誤語系與自訂 canonical 的處理；提交 URL 一律使用本站公開路由，若文章 canonical 指向外站則不送 IndexNow。
- [ ] 執行 `npm test -- src/lib/search-engine/indexable-url.test.ts`。

### Task 2: 建立搜尋引擎通知 outbox

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260906120000_search_engine_notifications/migration.sql`
- Create: `src/lib/search-engine/notification-repository.ts`
- Test: `src/lib/search-engine/notification-repository.test.ts`

- [ ] 新增通知資料表，至少保存 `url`、`engine`、`eventType`、`status`、`attempts`、`nextAttemptAt`、`lastError`、`createdAt`、`sentAt`，並以 `(engine, url, eventType)` 保障冪等。
- [ ] 實作 enqueue、批次 claim、成功完成、失敗退避與過期清理；重試間隔使用固定上限的指數退避。
- [ ] 測試重複 enqueue 合併、成功、失敗重試與永久失敗可觀測輸出。
- [ ] 執行 repository 測試與 Prisma migration 驗證。

### Task 3: 在發布流程寫入通知事件

**Files:**
- Modify: `src/app/(backoffice)/admin/posts/actions.ts`
- Modify: `src/lib/content/repository.ts`
- Test: `src/app/(backoffice)/admin/posts/actions.test.ts`

- [ ] 只有狀態由非公開變成 `PUBLISHED`、已發布文章內容更新、或由 `PUBLISHED` 變成其他狀態時 enqueue；保存資料與 enqueue 必須在同一資料庫交易中完成。
- [ ] 對發布、更新、下架分別產生 `publish`、`update`、`unpublish` 事件；canonical 為外站時只保留 sitemap 內容，不通知 IndexNow。
- [ ] 測試發布不被通知服務例外阻塞，且事件含正確 URL 與變更類型。

### Task 4: 實作 Bing IndexNow worker

**Files:**
- Create: `src/lib/search-engine/indexnow.ts`
- Create: `src/app/api/internal/search-engine/process/route.ts`
- Test: `src/lib/search-engine/indexnow.test.ts`

- [ ] 使用環境變數 `INDEXNOW_KEY` 與 `INDEXNOW_KEY_LOCATION`；批次呼叫 IndexNow endpoint，限制每批 URL 數量並驗證回應狀態。
- [ ] worker 驗證內部 bearer secret，claim outbox 後送出；成功標記完成，429/5xx 退避重試，4xx 記錄永久失敗。
- [ ] 透過 Vercel Cron 每 5 分鐘觸發 route；route 回傳 `summary`、`success`、`failure` 計數。
- [ ] 測試成功、429、錯誤金鑰與重試行為。

### Task 5: Google Search Console 與 Bing Webmaster 設定手冊

**Files:**
- Create: `docs/search-engine-submission.md`
- Modify: `README.md`

- [ ] 記錄一次性設定：驗證 `https://www.1wiki.org` 資源、提交 `https://www.1wiki.org/sitemap.xml`、確認 robots 與 canonical。
- [ ] 說明 Google 不提供一般文章的即時索引請求；新增或更新以 sitemap/內部連結觸發抓取，Search Console 用來檢查索引與 canonical。
- [ ] 說明 Bing Webmaster 提交 sitemap、建立 IndexNow key 檔案、設定 `INDEXNOW_KEY` 與 cron secret。
- [ ] 加入故障排查：sitemap 非 200、URL 不在 sitemap、canonical 指向外站、robots 阻擋、429/5xx、DNS/HTTPS。
- [ ] 文件「最後更新」設為 `2026-09-06`，列出驗證命令與執行日誌檔案名稱。

### Task 6: 端到端驗證與可觀測性

**Files:**
- Create: `src/lib/search-engine/search-engine-smoke.test.ts`
- Create: `docs/search-engine-smoke.summary.json`
- Modify: `docs/search-engine-submission.md`

- [ ] 驗證發布、更新、下架事件到 outbox，再到 worker 成功/失敗狀態的完整流程。
- [ ] 驗證 `/sitemap.xml`、`/robots.txt`、文章 canonical、IndexNow key location 均可用。
- [ ] 產生包含 `generated_at`、`summary`、`success`、`failure`、命令與結果的 smoke summary。
- [ ] 執行 `npm test -- src/lib/search-engine src/app/sitemap.test.ts`、`npm run lint`，並記錄結果；資料庫整合測試若逾時要單獨標註原因。

## Rollout Order

先部署 sitemap/robots 與 Google/Bing 帳戶設定，再部署 outbox 與發布事件，最後啟用 IndexNow cron。先觀察一週通知成功率與 Search Console/Bing 抓取狀態，再決定是否需要調整批次大小或退避參數。
