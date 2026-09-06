# 1Wiki

最後更新：2026-09-06

1Wiki 是提供 AI、軟體、社群與 3C 使用教學及疑難解答的多語系內容網站。繁體中文為預設語系，英文與日文已提供獨立入口；MVP 另包含文章後台、帳密權限、AI 初稿、SEO 與手動 AdSense 版位。

## 目前開發與發布政策

- 現階段所有功能與文件變更一律先在本機完成。
- 變更需先通過適用的本機測試、lint 與 production build 驗證。
- 在專案負責人明確確認前，不部署至 Vercel，不更新遠端環境變數或遠端資料庫。
- 部署前需先整理變更內容、測試結果、已知限制與必要的資料庫 migration，再另行執行發布。

目前功能、待驗收工作與驗證範圍見 [工作狀態](docs/project-status.md)，本次執行結果見 [測試紀錄](docs/test-log.md)。

## MVP 功能

- 具語系前綴的公開首頁、AI／軟體／社群分類、文章頁與政策頁
- 繁體中文、英文、日文語言選擇器；內容、分類與 SEO 各自獨立
- OWNER／EDITOR 後台帳號，無公開註冊與第三方登入
- 文章、三級分類、Rich Text Editor、YouTube／Shorts 嵌入與 SEO 欄位管理
- 作者庫、語系化作者頁與署名；文章卡片封面、同分類連續閱讀及分類頁載入更多
- OWNER 專用 GA4 流量監測、AI 配圖 Worker 監控與公開快取監控
- DeepSeek（預設）、OpenAI、Gemini 三選一的 AI 文章初稿、來源分析與選題生成
- OWNER 專用 Prompt 版本管理、歷史回復、LLM Token／失敗／耗時追蹤與美元成本估算
- canonical、Open Graph、Article structured data、sitemap 與 robots
- 手動 AdSense slot；Auto ads 預設關閉
- PostgreSQL、Prisma、Next.js App Router；正式建議部署至 GCP VM，Vercel 文件僅保留作為歷史替代方案

## 本機啟動

需要 Node.js 22 與 PostgreSQL。先建立空白資料庫，再執行：

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run bootstrap:owner
npm run dev
```

`bootstrap:owner` 只允許在尚未存在 OWNER 時執行。成功後請立即從環境設定移除 `INITIAL_OWNER_PASSWORD`。瀏覽器開啟 `http://localhost:3000/login` 即可登入後台。

## 多語系內容與網址

- `/` 及既有無語系前綴的公開網址會永久轉址到繁體中文 `/zh-tw/...`。
- 第一階段支援 `/zh-tw`、`/en`、`/ja`，頁首語言選擇器會進入所選語系首頁。
- 各語系的文章與分類完全獨立；相同 slug 可在不同語系重複使用，但文章只能選擇相同語系的分類。
- 英文與日文尚無已發布文章時顯示當地語言的空白首頁，並設為 `noindex, follow`、不加入 sitemap。
- 網站不自動翻譯，也不把不同語系文章視為彼此的翻譯版本，因此目前不輸出跨語系 `hreflang`。
- `/admin`、`/login`、`/change-password`、`/ads.txt`、`/robots.txt` 與 `/sitemap.xml` 維持無語系前綴。

新增語系時，依序擴充 `src/lib/i18n/config.ts`、`src/lib/i18n/dictionaries.ts`，建立該語系分類及文章，並補齊公開路由、SEO 與端到端測試。資訊頁是否公開由語系設定中的 `publishedInfoPages` 控制。

## 必要環境設定

| 名稱 | 說明 |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 正式網站根網址，不含結尾斜線 |
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `DIRECT_URL` | migration 使用的直接 PostgreSQL 連線字串 |
| `AUTH_SESSION_SECRET` | 至少 32 字元的隨機密鑰 |
| `INITIAL_OWNER_*` | 僅首次建立 OWNER 時暫時設定 |
| `CLOUDFLARE_R2_*` | R2 圖片上傳所需的帳號、bucket 與 S3 API 金鑰 |
| `R2_PUBLIC_BASE_URL` | R2 bucket 連接的公開自訂網域，例如 `https://media.example.com` |
| `DATABASE_BACKUP_R2_BUCKET` | 私有數據庫備份 R2 bucket；必須與公開圖片 bucket 分開 |
| `DATABASE_BACKUP_R2_PREFIX` | 備份物件前綴，預設 `database-backups` |
| `CACHE_REVALIDATE_SECRET` | cache-invalidator 呼叫 Next ISR 失效 endpoint 的內部密鑰 |
| `CLOUDFLARE_ZONE_ID` | Cloudflare HTML cache purge 的 zone ID；可選 |
| `CLOUDFLARE_API_TOKEN` | 僅具 Cache Purge 權限的 Cloudflare token；可選 |

可以用 `openssl rand -base64 48` 產生 session secret。後台密碼至少 12 字元，且需同時包含字母與數字；連續登入失敗五次會鎖定 15 分鐘。

## 文章圖片上傳（Cloudflare R2）

後台正文工具列可上傳 JPEG、PNG、WebP、GIF 圖片，檔案上限為 10MB。瀏覽器會先向本站取得僅限單一物件、五分鐘有效的上傳網址，再直接將檔案傳至 R2；R2 API 金鑰不會交給瀏覽器。

請建立 R2 bucket 與僅有該 bucket 物件讀寫權限的 R2 API Token，並設定上述環境變數。正式環境請將 bucket 連接到 Cloudflare 管理的公開自訂網域，填入 `R2_PUBLIC_BASE_URL`；`r2.dev` 僅適合開發測試。Bucket 的 CORS 請限制為實際網站來源：

```json
[
  {
    "AllowedOrigins": ["https://your-site.example"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 數據庫備份（Cloudflare R2）

後台 `/admin/database-backups` 僅 OWNER 可用。設定每日時間、時區與保留數量後，`database-backup-worker` 會使用 PostgreSQL `pg_dump` custom format 壓縮數據庫，再上傳到私有 R2；備份檔不加密，下載時才產生五分鐘有效的簽名網址。超過保留數量的成功備份會自動刪除 R2 物件及紀錄。

請為備份建立獨立的私有 R2 bucket 與專用 API token，並填入 `DATABASE_BACKUP_R2_BUCKET`。不要把備份 bucket 設為公開，也不要使用 `R2_PUBLIC_BASE_URL`；Docker image 已包含 `postgresql-client`，Compose 會另外啟動 `database-backup-worker`。

同一頁的「資料清理保留期限」可分別設定 LLM 用量、流量同步紀錄、搜尋通知、AI 配圖任務、快取失敗事件與備份失敗紀錄的保留天數，範圍為 1–3650 天。頁面流量只保存每個頁面的累計瀏覽量，不保存每日明細或網站每日彙總。預設值為：LLM 180 天、同步紀錄 180 天、搜尋成功 90 天、搜尋失敗 365 天、AI 配圖 90 天、快取失敗 180 天、備份失敗 30 天。`database-backup-worker` 每 24 小時最多執行一次清理；過期 Session 會清除，核心文章與設定資料不會自動刪除。仍在處理中的工作與仍含原始圖片的 AI 任務會受到保護。

## AI 供應商

`LLM_PROVIDER` 可設為 `deepseek`、`openai` 或 `gemini`，預設為 `deepseek`。只需設定所選供應商的 API key 與 model：

```dotenv
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
```

API key 只在伺服器端使用。一般「新增文章」仍可用主題與關鍵字快速填入初稿；後台「AI 生成」則會先分析使用者貼上的參考內容，提出 Troubleshooting／How-to 主題，再依選定搜尋意圖建立草稿。AI 生成內容一律需要人工檢查並手動發布，供應商失敗時不會暗中切換到另一家。

所有 LLM 呼叫使用的 Prompt 都由 OWNER 在 `/admin/prompts` 管理；儲存或回復會建立不可變的新版本並立即套用。`/admin/llm-usage` 顯示逐次呼叫的 Prompt 版本、Token、狀態與耗時，並可維護各供應商模型的每百萬 Token 美元費率。未設定費率或供應商未回傳 Token 時，成本會標示為「無法估算」，不會以字數猜測。

## AdSense

預設 `NEXT_PUBLIC_ADSENSE_ENABLED=false`，正式環境不會載入 AdSense script、不會輸出廣告節點，也不會留下預覽空白。開發環境會以淡灰色方框顯示版位名稱。

核准後的設定順序：

1. 在 AdSense 建立各版位獨立的 responsive display unit。
2. 填入 `NEXT_PUBLIC_ADSENSE_CLIENT_ID` 與各 `NEXT_PUBLIC_ADSENSE_SLOT_*`。
3. 填入 `ADSENSE_PUBLISHER_ID`，網站會自動提供 `/ads.txt` 並加入帳戶 metadata。
4. 配置 Google 認證 CMP 或 Google Privacy & Messaging。
5. 最後將 `NEXT_PUBLIC_ADSENSE_ENABLED` 改為 `true` 並重新部署。

文章正文最多顯示 `article_after_intro`、`article_mid`、`article_end` 三個版位；`article_mid` 只在至少 1,200 個可見字元的長文中，插入接近全文 45% 的 H2 段落邊界。桌面右欄另有 `sidebar_desktop` 與 `sidebar_desktop_sticky`，只在 1024px 以上顯示；廣告採接近視窗才初始化。分類頁另有開頭、列表間、末尾及側欄版位，完整行為見 [連續閱讀與廣告](docs/article-auto-loading.md)。`feed_inline` 目前只有中央設定，MVP 不啟用。

## AI 配圖

文章編輯器支援 AI 分析段落、Gemini 生圖、R2 上傳及預覽插入。`.env.example` 使用 `gemini-3.1-flash-lite-image`、`1K`／`9:16`；未設定時程式 fallback 為 `gemini-3.1-flash-image`、`512`／`9:16`，保留原生尺寸。需執行新增 migration 並啟動 `npm run worker:images`；完整設定、復原行為與驗證方式見 [AI 配圖文件](docs/ai-article-images.md)。

## 編輯、流量與搜尋引擎

- [文章編輯與媒體](docs/article-editing.md)：封面卡片、R2 封面上傳、發布補圖、SEO 圖片優先順序與影片。
- [作者庫](docs/author-library.md)：作者指派、封存及公開作者頁。
- [流量監測](docs/traffic-monitoring.md)：GA4 設定、同步入口與指標限制。
- [搜尋引擎通知](docs/search-engine-submission.md)：IndexNow 目前為部分實作；Cron、金鑰驗證及可靠性仍待完成，不可視為已啟用。

## 測試與驗收

單元與整合測試使用獨立測試資料庫。預設連線是 `postgresql://postgres:postgres@127.0.0.1:55432/onewiki_test`，Vitest 的 `src/test/setup.ts` 使用 `DATABASE_URL`／`DIRECT_URL`；請明確設定為隔離測試庫。E2E 的測試庫設定另見 Playwright 設定。

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

端到端測試會先建立測試資料，再以正式建置模式驗證語系轉址、語言選擇器、英文與日文空白首頁、內容隔離、sitemap、登入權限、政策頁，以及 360／390／768／1280px 下的 AdSense 關閉狀態。測試資料庫不得指向正式資料庫，因為測試會清空其中的 1Wiki 資料表。

## Vercel 部署（歷史替代方案）

正式環境優先採用下方 GCP VM 方案。以下流程僅作為既有 Vercel 環境的維護參考；完成本機修改與驗證後，仍需取得專案負責人的明確確認，才可操作 Vercel、遠端資料庫或正式環境設定。Vercel 若啟用公開 HTML cache，必須另行接妥相同的精準失效流程。

1. 建立 Vercel 專案並連接本 repository。
2. 建立可從 Vercel 連線的 PostgreSQL，填入 Production、Preview 所需環境變數。
3. 備份正式資料庫後執行 `npm run db:migrate`。`20260904130000_add_content_locales` 會將既有文章與分類回填為 `zh-tw`，並建立語系複合唯一鍵及外鍵；首次部署才另執行 `npm run db:seed` 與一次性的 `npm run bootstrap:owner`。
4. 使用預設的 `npm run build` 建置並部署。
5. 登入後台發布第一篇文章，檢查 `/sitemap.xml`、`/robots.txt` 與文章原始碼中的 SEO metadata。

後續 migration 另包含 AI 配圖、Worker 心跳、作者庫及 GA4；`d5f0074` 新增 `20260906120000_search_engine_notifications`，須先完成搜尋引擎待辦與驗證再安排上線。所有 migration 是否已套用需逐環境確認，本次未操作資料庫。

一般正式環境更新順序固定為：

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

`20260904180000_prompt_llm_usage` 會同時建立 Prompt、版本、模型費率、用量資料表與四個既有功能的初始 Prompt，因此應先完成 migration 再啟動新版應用。

## GCP VM 部署（正式建議模式）

若需要讓 Next.js、PostgreSQL 與 AI 配圖 Worker 位於同一個亞洲區域，可使用 `asia-southeast1` 的 Compute Engine VM。專案提供 `docker-compose.vm.yml`，包含 Next.js、AI Worker、PostgreSQL 與 Caddy；PostgreSQL 不會發布任何 host port，只有 Compose 內部網路可連線。

首次部署：

```bash
cp deploy/vm.env.example .env.production
# 填妥 .env.production，並確認 SITE_HOST（正式 www 網域）與 SITE_REDIRECT_HOST（非 www 網域）的 DNS 都指向 VM 固定 IP
docker compose -f docker-compose.vm.yml up -d --build
# 預熱首頁、sitemap 中的公開頁面，避免第一位訪客遇到 ISR cold miss
SITE_URL=https://www.example.com PREWARM_LIMIT=100 scripts/prewarm-public-pages.sh
```

`build` service 會在 PostgreSQL 健康且 migration 完成後執行 production build，網站與 Worker 共用 build volume；公開頁面使用 ISR，快取存於 `next_build` volume。`cache-invalidator` 會處理發布後的公開 URL 失效事件，呼叫受保護的 Next endpoint 並在設定 Cloudflare 憑證時清除 HTML edge cache。Caddy 負責 HTTPS，需讓 VM 的 80／443 port 通過 GCP Firewall。

### Coolify Proxy 部署替代方案

若使用 Coolify 管理這台 VM，請改用 `docker-compose.coolify.yml`，不要再啟動 `docker-compose.vm.yml` 的 Caddy service。Coolify Proxy 會負責 HTTPS、80／443 與網域轉發；在 Coolify 的 Compose service 設定中，將正式網域 `www.example.com` 綁定到 `web` 的 container port `3000`，再新增 `example.com` 網域並設定 301 redirect 到 `https://www.example.com`。Coolify Compose 部署會自動將 Proxy 接入服務網路，因此 `web` 只需保留 `expose: 3000`，PostgreSQL、Worker 與 `cache-invalidator` 維持內部網路。

```bash
# 在 Coolify 建立 Git-based Docker Compose resource，檔案選此檔
docker compose -f docker-compose.coolify.yml config
```

Coolify 方案不會讓 Next.js 本身更快；速度仍主要來自 Cloudflare HTML cache、Next.js ISR、資料庫查詢與圖片 CDN。它的優點是網域／TLS、部署、健康檢查與回滾管理較方便，代價是 Coolify Proxy 與平台服務會占用額外 VM 資源。Coolify 的 persistent storage、health check 與 Compose 設定應以 repository 中的 Compose 檔為準；正式上線前需在 Coolify 內設定 `postgres_data` 與 `next_build` 的持久儲存及備份策略。

快取失效、`/admin/cache` 監控與 Cloudflare token 設定見 [公開快取與 Cloudflare 監控](docs/cache-monitoring.md)。

若網站前方使用 Cloudflare，建議只對不含登入 Cookie 的公開 GET 頁面啟用 HTML cache：`/zh-tw`、`/en`、`/ja`、`/articles/*`、`/category/*`、`/authors/*`。`/admin/*`、`/login`、`/api/*`、帶 session Cookie 的請求必須 bypass。文章發布或編輯後，除呼叫 Next.js 的 `revalidatePath` 外，也要透過 Cloudflare API 清除對應 URL；在尚未接上 purge API 前，HTML edge cache TTL 應保持短期，避免發布後持續顯示舊內容。

正式環境請另以 Cloud Scheduler 或 VM cron 執行 `scripts/backup-vm-postgres.sh`，並將 `BACKUP_BUCKET` 指向不同於 VM 所在磁碟的 Cloud Storage bucket。恢復備份前必須先在隔離 VM 或測試資料庫演練。

Worker 管理頁面不操作 Docker，也不需要 `WORKER_*_COMMAND`。它只更新 `WorkerHeartbeat.desiredState`，AI Worker 自己依此狀態暫停或繼續處理；Compose 只負責維持 Worker 容器存活，不需暴露 Docker socket。OWNER 可在 `/admin/cache` 查看公開快取失效事件、Cloudflare purge 設定與失敗重試佇列。

多語系架構決策見 [`docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md`](docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md)，執行計畫見 [`docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md`](docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md)。原始 MVP 的完整需求與決策見 [`docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md`](docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md)。

## 上游來源

本專案選擇性移植並重構 [SamurAIGPT/blogger-cms](https://github.com/SamurAIGPT/blogger-cms) 的 Rich Text Editor 與文章管理概念。原始專案採 MIT License；授權文字見 [`LICENSE.upstream`](LICENSE.upstream)。Stripe、credits、pricing、MuAPI、Google OAuth 與使用者 API key 登入不屬於本專案。
