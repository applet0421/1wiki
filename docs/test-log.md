# 本機驗證紀錄

最後更新：2026-09-07

## 2026-09-07 品牌 SEO OWNER 後台與多語系設定

- `20260907130000_add_brand_seo_settings`：在隔離 PostgreSQL 成功套用，建立全域品牌設定與依系統語系儲存的首頁／分享 SEO 設定。
- 品牌素材會先取得 R2 的實際位元組，再以圖片解碼檢查格式、大小與尺寸；管理端僅接受短效上傳流程產生的 R2 公開網址。
- 目標回歸涵蓋 repository 預設值、表單驗證、實體圖片驗證、OWNER 上傳 API、OWNER action、管理表單、公開固定素材路由、metadata、manifest 與 JSON-LD。

執行命令：

```sh
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test npx prisma migrate deploy
npm test -- src/lib/brand-seo 'src/app/api/admin/brand-seo/uploads/route.test.ts' 'src/app/(backoffice)/admin/brand-seo' src/components/admin/brand-seo-form.test.tsx 'src/app/brand/[asset]/route.test.ts' 'src/app/[locale]/layout.test.ts' src/app/manifest.test.ts src/lib/seo/structured-data.test.ts
npx tsc --noEmit
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build
```

- 隔離資料庫：20 個 migration 已套用，包含本輪品牌 SEO migration。
- 目標測試：13 個測試檔、26 項測試通過；TypeScript 與 production build：通過。
- 對本輪程式檔執行的 ESLint：通過。完整 `npm run lint` 仍僅受既有 `src/lib/wechat-import/browser-extractor.ts` 的 1 個 error 與 `src/lib/retention/cleanup.ts` 的 1 個 warning 阻擋。
- 未執行正式資料庫 migration、部署、Google Search Console 提交或要求重新檢索。

## 2026-09-07 Google 品牌搜尋外觀

- `src/lib/seo/structured-data.test.ts`：驗證 `WebSite` 使用精簡品牌名、根網址與網域備援名稱。
- `src/app/[locale]/layout.test.ts`、`src/app/manifest.test.ts`：驗證品牌式摘要及 ICO／PNG／SVG 圖示宣告。
- `src/app/favicon-assets.test.ts`：驗證 PNG 尺寸與 ICO 檔頭、48px 尺寸。
- `src/components/site/header.test.tsx`：驗證含子分類的頂層分類在展開前已有直接連結，原有逐層展開與鍵盤操作仍通過。

執行命令與結果：

```sh
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test npx prisma migrate deploy
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test npm test
DATABASE_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
DIRECT_URL=postgresql://eirikr@127.0.0.1:5432/onewiki_test \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build
npx eslint <本次變更的 TypeScript／TSX 檔案>
git diff --check
```

- 測試資料庫：補套 6 個既有 migration，19 個 migration 全部已套用。
- Vitest：120 個測試檔、371 項測試通過；另有既有 `pg` deprecation warning。
- Next.js production build／TypeScript：通過。
- 本次變更檔案 ESLint：通過。
- `git diff --check`：通過。
- 完整 `npm run lint`：未通過；既有 `src/lib/wechat-import/browser-extractor.ts` 有 1 個 `no-explicit-any` error，`src/lib/retention/cleanup.ts` 有 1 個 unused-variable warning，兩檔皆非本次變更。
- 尚未部署正式站、要求 Google 重抓或驗證實際 SERP 更新。

## 2026-09-06 累計流量資料簡化

- `TrafficDailyPage` 與 `TrafficDailySite` 改由 `TrafficPageTotal` 取代，每個 canonical page path 僅保留一筆累計瀏覽量。
- 流量後台移除日期趨勢、活躍使用者、工作階段與互動欄位。
- migration 會先彙整既有每日頁面瀏覽量，再移除每日資料表。

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
