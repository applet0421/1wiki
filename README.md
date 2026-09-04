# 1Wiki

最後更新：2026-09-04

1Wiki 是提供 AI、軟體、社群與 3C 使用教學及疑難解答的多語系內容網站。繁體中文為預設語系，英文與日文已提供獨立入口；MVP 另包含文章後台、帳密權限、AI 初稿、SEO 與手動 AdSense 版位。

## 目前開發與發布政策

- 現階段所有功能與文件變更一律先在本機完成。
- 變更需先通過適用的本機測試、lint 與 production build 驗證。
- 在專案負責人明確確認前，不部署至 Vercel，不更新遠端環境變數或遠端資料庫。
- 部署前需先整理變更內容、測試結果、已知限制與必要的資料庫 migration，再另行執行發布。

## MVP 功能

- 具語系前綴的公開首頁、AI／軟體／社群分類、文章頁與政策頁
- 繁體中文、英文、日文語言選擇器；內容、分類與 SEO 各自獨立
- OWNER／EDITOR 後台帳號，無公開註冊與第三方登入
- 文章、分類、Rich Text Editor 與 SEO 欄位管理
- DeepSeek（預設）、OpenAI、Gemini 三選一的 AI 文章初稿、來源分析與選題生成
- OWNER 專用 Prompt 版本管理、歷史回復、LLM Token／失敗／耗時追蹤與美元成本估算
- canonical、Open Graph、Article structured data、sitemap 與 robots
- 手動 AdSense slot；Auto ads 預設關閉
- PostgreSQL、Prisma、Next.js App Router，可部署至 Vercel

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

可以用 `openssl rand -base64 48` 產生 session secret。後台密碼至少 12 字元，且需同時包含字母與數字；連續登入失敗五次會鎖定 15 分鐘。

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

文章正文最多顯示 `article_after_intro`、`article_mid`、`article_end` 三個版位；`article_mid` 只在至少 1,200 個可見字元的長文中，插入接近全文 45% 的 H2 段落邊界。桌面右欄另有 `sidebar_desktop`，只在 1024px 以上顯示。`feed_inline` 目前只有中央設定，MVP 不啟用。

## 測試與驗收

單元與整合測試使用獨立測試資料庫。預設連線是 `postgresql://postgres:postgres@127.0.0.1:55432/onewiki_test`，也可用 `TEST_DATABASE_URL` 覆寫。

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

端到端測試會先建立測試資料，再以正式建置模式驗證語系轉址、語言選擇器、英文與日文空白首頁、內容隔離、sitemap、登入權限、政策頁，以及 360／390／768／1280px 下的 AdSense 關閉狀態。測試資料庫不得指向正式資料庫，因為測試會清空其中的 1Wiki 資料表。

## Vercel 部署（確認後執行）

以下流程目前僅作為發布手冊保留。完成本機修改與驗證後，仍需取得專案負責人的明確確認，才可操作 Vercel、遠端資料庫或正式環境設定。

1. 建立 Vercel 專案並連接本 repository。
2. 建立可從 Vercel 連線的 PostgreSQL，填入 Production、Preview 所需環境變數。
3. 備份正式資料庫後執行 `npm run db:migrate`。`20260904130000_add_content_locales` 會將既有文章與分類回填為 `zh-tw`，並建立語系複合唯一鍵及外鍵；首次部署才另執行 `npm run db:seed` 與一次性的 `npm run bootstrap:owner`。
4. 使用預設的 `npm run build` 建置並部署。
5. 登入後台發布第一篇文章，檢查 `/sitemap.xml`、`/robots.txt` 與文章原始碼中的 SEO metadata。

一般正式環境更新順序固定為：

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

`20260904180000_prompt_llm_usage` 會同時建立 Prompt、版本、模型費率、用量資料表與四個既有功能的初始 Prompt，因此應先完成 migration 再啟動新版應用。

多語系架構決策見 [`docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md`](docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md)，執行計畫見 [`docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md`](docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md)。原始 MVP 的完整需求與決策見 [`docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md`](docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md)。

## 上游來源

本專案選擇性移植並重構 [SamurAIGPT/blogger-cms](https://github.com/SamurAIGPT/blogger-cms) 的 Rich Text Editor 與文章管理概念。原始專案採 MIT License；授權文字見 [`LICENSE.upstream`](LICENSE.upstream)。Stripe、credits、pricing、MuAPI、Google OAuth 與使用者 API key 登入不屬於本專案。
