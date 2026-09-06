# 本機驗證紀錄

最後更新：2026-09-06

## 2026-09-06 資料保留清理功能

- `src/lib/retention/settings.test.ts`：3 項測試通過。
- `src/lib/retention/cleanup.test.ts`：2 項測試通過，涵蓋日期 cutoff、狀態保護與清理摘要。
- `src/lib/backup/worker-cycle.test.ts`：2 項測試通過，涵蓋 24 小時執行間隔與清理錯誤隔離。
- `src/app/(backoffice)/admin/database-backups/actions.test.ts`：2 項測試通過。
- `src/app/(backoffice)/admin/database-backups/page.test.tsx`：1 項測試通過。
- TypeScript 與 ESLint：通過。
- 正式資料庫 migration 與正式環境清理尚未執行；部署後由 Worker 依設定逐步清理。

基準：目前 `main` 工作樹；本次文件同步與 Coolify Compose 部署檔驗證未連線外部服務，也未執行正式 VM／Coolify 部署或瀏覽器驗收。這份紀錄不取代歷史測試，也不證明正式環境可發布。

## 2026-09-06 最新全量驗證

使用本機隔離 PostgreSQL `127.0.0.1:5432/onewiki_test`，不使用正式資料庫：

```sh
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test npm test
npx tsc --noEmit
npm run lint
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build
```

- PostgreSQL migration：13 個 migration 全部成功套用，包含公開快取失效與 Worker desired state。
- Vitest：90 個測試檔、310 項測試通過。
- TypeScript：通過。
- ESLint：通過。
- Next.js production build：通過；公開首頁為 ISR／SSG，後台、API、Worker 控制維持 Dynamic。
- `POSTGRES_PASSWORD=local-validation docker compose -f docker-compose.coolify.yml config --quiet`：通過；Coolify 版本沒有 Caddy、80／443 host port 或 PostgreSQL host port，`web` 僅 expose container port `3000`。
- `git diff --check`：通過。
- Cloudflare 真實 zone purge、正式 VM 部署與實機 Lighthouse 尚未執行。

## 歷史驗證結果

```sh
npm test -- src/lib/search-engine/notifications.test.ts src/components/admin/admin-nav.test.tsx src/components/site/article-card.test.tsx src/components/admin/youtube.test.ts src/lib/seo/image.test.ts src/lib/ai/image-config.test.ts
npm run lint
```

- Vitest：exit 0，6 個檔案、18 項測試通過，0 失敗。
- 覆蓋：搜尋事件分類／IndexNow payload、後台角色導覽、卡片封面、YouTube／Shorts、SEO 圖片解析、AI 圖片設定。
- ESLint：exit 0，0 errors、1 warning；`src/components/site/article-card.tsx:19` 的 `@next/next/no-img-element`，尚未處理。
- 搜尋引擎僅有分類與 payload 的單元覆蓋，沒有實際提交或 outbox 資料庫驗證。

執行日誌版本：[search-engine-smoke.summary.json](search-engine-smoke.summary.json) 的 `generated_at`。檔名沿用搜尋引擎計畫，但 `scope` 明確為 `local-unit-and-lint`；`end_to_end_verified` 與 `external_submission_verified` 均為 false。

## 待驗證

- 在隔離測試庫重跑文章保存／封面補值、搜尋通知交易與 migration。
- 補上 IndexNow 2xx、4xx、429、5xx、併發領取、重試與手動處理 action 回歸。
- 真實 sitemap／robots／canonical／key location、Cron 呼叫與 Google／Bing 設定。
- R2 封面上傳、完整 TypeScript／production build／E2E。

以上待辦需依 [工作狀態](project-status.md) 和 [搜尋引擎通知](search-engine-submission.md) 的實作缺口安排，未執行項目不計入失敗數或成功數。
