# 目前工作狀態

最後更新：2026-09-09

文件狀態：現行真相來源。基準為 `main` 的 `4b9d521`，加上 2026-09-09 工作樹中尚未提交的首頁文章流、首頁廣告、響應式導覽與相關測試／樣式。未提交項目均視為進行中，不代表已發布。

## 摘要

- 應用基座為 Next.js 16.3.4、React 19.2.8、Prisma 7.10.0、PostgreSQL、Vitest 5 與 Playwright 1.62.1，Node.js 下限為 22。
- repository 目前有 26 個 migration；最新為 `20260908030000_add_category_inline_ad_interval`。2026-09-08 紀錄顯示本機隔離資料庫與當時設定的 Supabase Direct connection 已套用 26 個 migration，但本次文件整理未重新連線確認遠端狀態。
- 本機已具備 GCP VM／Coolify Compose、ISR、公開快取失效、Cloudflare purge、資料庫備份及四個長駐 Worker 服務；不等於正式 VM、DNS、Cloudflare 或 Coolify 已完成部署。
- 最新文件入口見 [文件中心](README.md)，實際驗證見 [測試紀錄](test-log.md)。

## 功能與文件入口

| 項目 | 目前狀態 | 文件 |
| --- | --- | --- |
| 多語系、三級分類、文章／資訊頁後台、AI 初稿與 Prompt／用量管理 | 已提交實作；既有設計與計畫保留歷史要求 | [README](../README.md) |
| 作者庫、封存／恢復、作者頁及署名 | 已提交實作 | [作者庫](author-library.md) |
| GA4 追蹤與 OWNER 流量監測 | 已提交實作；外部設定與資料同步狀態本次未查核 | [流量監測](traffic-monitoring.md) |
| AI 配圖、上傳復原、Worker 監控與控制 | 已提交實作；範例環境與程式 fallback 值不同 | [AI 配圖](ai-article-images.md) |
| 公開 ISR、快取失效 Outbox、Cloudflare purge 與 `/admin/cache` | 已提交實作；Cloudflare 外部 token、DNS、正式 VM 與 Coolify Proxy 尚待設定 | [快取監控](cache-monitoring.md) |
| GCP VM 部署 | 已提供原生 Compose + Caddy 及 Coolify Proxy 專用 Compose；尚未部署正式 VM | [README 部署說明](../README.md) |
| 文章連續閱讀、分類頁載入更多、延後載入廣告 | 已提交實作 | [連續閱讀](article-auto-loading.md) |
| 文章／分類廣告節奏、Bottom Anchor 與 1280px 桌面側欄 | 已提交實作；正式 AdSense slot 與填充狀態待外部驗證 | [連續閱讀](article-auto-loading.md) |
| 文章卡片封面、R2 封面上傳、發布補值與 YouTube Shorts | 已提交實作；完整 R2 整合依環境驗證 | [編輯與媒體](article-editing.md) |
| 微信五步驟匯入、30 分鐘暫存、模式化改寫與繁中正規化 | 已提交實作並有本機／歷史真實擷取紀錄；R2 轉存、發布及更多來源仍待外部驗證 | [微信回歸](wechat-fetch-regression.md) |
| Bing IndexNow 通知佇列、OWNER 後台、處理 API 與 key 檔 | 已提交部分實作；排程、交易與可靠性尚未達可發布條件 | [搜尋引擎通知](search-engine-submission.md) |
| Google 品牌搜尋外觀與設定 | 已補 48×48 ICO／PNG、精簡 `WebSite` 品牌資料、品牌式首頁摘要、可直接爬取的頂層分類連結，以及僅 OWNER 可用的 `/admin/brand-seo` 多語系設定與 R2 品牌素材上傳；待部署、重抓與 Search Console 觀察 | [搜尋引擎通知](search-engine-submission.md) |

## 進行中工作樹

- 首頁改為共用分類卡片樣式的最新文章流，新增 `ArticleFeedList`，保留最多 12 篇的既有查詢。
- 首頁新增 `home_inline`、`home_end`、`home_sidebar_desktop` 手動 AdSense placement；Inline 沿用 OWNER 的分類間隔設定，首頁與文章／分類側欄皆以 1280px 為桌面門檻。
- 導覽列新增桌面完整選單、平板「更多」與手機抽屜；包含 Escape、焦點回復、body scroll lock 與三語字典文字。
- 首頁文案、樣式及 favicon 正在調整。以上變更尚未完成本輪全量測試、Lint、Build 與瀏覽器驗收。

## 搜尋引擎功能待完成

- 處理入口只匯出 POST，需接妥 Cron 呼叫方式；確認兩個 secret 的優先順序。
- 文章保存與通知 upsert 尚未放入同一交易；通知寫入失敗可能在文章已保存後顯示儲存失敗。
- 補上原子 claim、有限次數重試、永久失敗、過期清理及併發時新事件不被舊批次覆蓋的保護。
- canonical 現採字串前綴判斷；發布時間、刪除事件、slug 變更前的舊 URL 尚待完整處理。
- 正式部署後驗證既有 IndexNow key 靜態檔為 200，並確保 `INDEXNOW_KEY` 與檔名／內容一致；目前不支援自訂 `keyLocation`。
- 補上資料庫、HTTP 成功／失敗、完整流程及真實 sitemap／key location 驗證。

## 資料庫與發布

目前 migration 包含多語系、Prompt／用量、三級分類、AI 配圖、Worker 心跳、作者庫、GA4、搜尋通知、公開快取失效、資訊頁、資料庫備份、資料保留、微信匯入、品牌 SEO、文章廣告／Anchor 設定、微信 Prompt 拆分與分類 Inline 間隔。最新 migration 為 `20260908030000_add_category_inline_ad_interval`。Coolify 部署仍須讓新版 `web` 啟動；PostgreSQL 與 `next_build` 必須使用持久儲存。

發布前先完成適用的隔離資料庫回歸、型別檢查與 production build，確認 migration 與環境設定，再依 README 的發布政策取得確認。搜尋引擎功能應先完成上列缺口再啟用排程。

## 驗證基準與發布門檻

[測試紀錄](test-log.md) 保存每輪真實結果。2026-09-09 全量 Vitest 為 142 個測試檔中 138 通過、4 失敗，458 項中 453 通過、5 失敗；聚焦首頁／導覽／文章流／AdSense 的 24 項則全數通過，TypeScript 通過。完整 Lint 有 1 error／1 warning；Build 編譯與型別通過，但靜態頁產生因目前資料庫主機 `base` 無法連線而失敗。詳細失敗清單見測試紀錄。

發布前必須重新執行適用的隔離資料庫 migration、全量 Vitest、`npx tsc --noEmit`、`npm run lint`、production build 與關鍵 E2E／瀏覽器斷點驗收。外部功能另須逐項確認 R2、GA4、Cloudflare、AdSense、Google Search Console、Bing Webmaster、DNS、TLS 及正式資料庫。

本次相關文件同步不涉及 Meta Creator Marketplace Phase 1；本儲存庫未找到該功能的 PRD、測試紀錄或 API 能力文件。
