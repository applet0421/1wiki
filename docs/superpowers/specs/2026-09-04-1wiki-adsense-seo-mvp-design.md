# 1Wiki AdSense SEO 科技教學站 MVP 設計

最後更新：2026-09-04

## 1. 產品目標

建立一個能快速發布繁體中文科技教學、累積搜尋流量並在取得 Google AdSense 核准後安全投放廣告的極簡內容網站。

網站名稱為「1Wiki｜AI、軟體、3C 使用教學與疑難解答」，預設語言與頁面語意標記為繁體中文（`zh-Hant-TW`）。正式網址由 `NEXT_PUBLIC_SITE_URL` 設定，程式不得寫死部署網域。

MVP 的優先順序是：可靠發布與公開閱讀、基本 SEO、可維護的後台、可切換的 AI 文章草稿生成，最後才是廣告投放。MVP 不包含 Keyword Agent、Flowise、Search Console API、多語系、會員付費、訂閱、複雜 Dashboard 或自動內容探索。

## 2. 基座決策

採「選擇性移植並重構」策略，以 MIT 授權的 [SamurAIGPT/blogger-cms](https://github.com/SamurAIGPT/blogger-cms) 作為候選基座：保留有價值的 Rich Text Editor、文章 CRUD 與 Google 登入骨架，重建公開前台、資料模型、權限、AI provider、SEO 與 AdSense 邊界。

目前正式 repository 是 `applet0421/1wiki`。原始 Blogger CMS repository 應設為 `upstream`，正式 repository 保持為 `origin`，並在 README 保留來源與 MIT 授權說明。

原始基座不得原封不動上線，原因如下：

- 實際依賴已是 Next.js 16，而 README 仍描述 Next.js 14。
- 基準 production build 可完成，但依賴稽核發現 17 項問題（1 critical、12 high、4 moderate）。
- API Key 登驗會把使用者 API key 當作身份並存入資料庫，不符合本產品的安全邊界。
- Prisma schema 含 credits、billing 與多組無關影像產品資料表。
- 缺少公開文章、slug、內容 HTML 清理、完整 metadata、sitemap 與 robots 實作。

移植時必須更新至相容且無已知高風險警示的依賴組合，移除 Stripe、Credits、Pricing、Subscription、MuAPI、使用者自帶 API key 與無關資料模型。

## 3. 系統架構與路由

系統是單一 Next.js App Router 應用程式，部署於 Vercel；資料存於 PostgreSQL，由 Prisma 存取。

### 3.1 公開路由

- `/`：首頁，顯示三大分類、最新文章與精選解答。
- `/ai`、`/software`、`/social`：固定分類入口。
- `/category/[slug]`：通用分類頁，支援日後新增 3C 等分類。
- `/articles/[slug]`：正式公開文章頁。
- `/about`、`/contact`、`/privacy`、`/terms`：信任與政策頁。
- `/sitemap.xml`：只列出可索引的正式公開網址。
- `/robots.txt`：允許公開內容，排除管理與內部路由。
- `/ads.txt`：設定有效 `ADSENSE_PUBLISHER_ID` 時輸出正確 publisher record。

公開內容以 Server Components 直接讀取已發布文章，以便輸出完整初始 HTML、metadata 與結構化資料。

### 3.2 管理路由

- `/login`：Google 登入。
- `/admin`：文章與分類管理。
- `/admin/posts/new`：建立文章與使用 AI 產生草稿。
- `/admin/posts/[id]`：編輯、發布、撤回與刪除文章。

管理互動使用 Client Components。所有 `/admin/**` 頁面及寫入 API 必須同時驗證登入狀態與 `ADMIN_EMAILS` 白名單，不可只依賴前端隱藏。未授權使用者不得讀取草稿或呼叫生成、建立、更新、刪除 API。

## 4. 資料模型與發布流程

### 4.1 User

保留 NextAuth/Prisma 所需的 `User`、`Account`、`Session` 與 `VerificationToken`。`User` 不包含 credits、subscription 或第三方 AI key。

### 4.2 Category

分類包含：

- `id`
- `name`
- `slug`（唯一）
- `description`
- `createdAt`
- `updatedAt`

初始資料必須包含：

- `ai`
- `software`
- `social`

### 4.3 Post

文章包含：

- `id`
- `title`
- `slug`（唯一且可在後台編輯）
- `excerpt`
- `contentHtml`
- `coverImage`
- `status`：`DRAFT` 或 `PUBLISHED`
- `authorId`
- `categoryId`
- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `canonicalUrl`
- `publishedAt`
- `createdAt`
- `updatedAt`

slug 預設由標題產生。重複 slug 應回傳明確驗證錯誤，不自動覆蓋既有文章。自訂 canonical 為空時，以 `NEXT_PUBLIC_SITE_URL` 與 `/articles/[slug]` 組成。

AI 生成結果只填入尚未儲存的編輯表單；只有管理者明確儲存後才建立文章。發布時必須具備標題、slug、分類、摘要及非空正文。公開查詢、首頁、分類頁、sitemap 與結構化資料只使用 `PUBLISHED` 文章。

Contact 頁使用公開聯絡信箱或 `mailto:`，不建立表單後端、寄信服務或垃圾信防護。
聯絡信箱由 `NEXT_PUBLIC_CONTACT_EMAIL` 設定；未設定時只顯示一般聯絡說明，不輸出失效連結。

## 5. HTML 安全

文章資料庫不得包含 AdSense `<script>` 或 `<ins>`。文章在寫入前必須經 allowlist HTML sanitizer 處理，移除 script、event handler、危險 URL、iframe 與非允許屬性；公開 renderer 只輸出清理後的 HTML。

Rich Text Editor 支援 MVP 所需的 paragraph、H2、H3、粗體、斜體、底線、連結、有序與無序清單。MVP 不增加複雜 block editor、協作或版本歷史。

## 6. AI 文章生成

AI 層公開單一 `generateArticle()` 能力，管理頁與 API 不直接耦合特定供應商。支援三個 provider adapter：

- `deepseek`（預設）
- `openai`
- `gemini`

環境變數如下：

```env
LLM_PROVIDER=deepseek

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash

OPENAI_API_KEY=
OPENAI_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=
```

只有目前選用的 provider 需要有效金鑰與 model。所有金鑰均為 server-only，不得使用 `NEXT_PUBLIC_` 前綴、存入資料庫、回傳到瀏覽器或出現在錯誤訊息。

三個 adapter 將結果正規化為：

- `title`
- `contentHtml`
- `excerpt`
- `seoTitle`
- `seoDescription`
- `seoKeywords`

每個 provider 使用其正式 API 的結構化／JSON 輸出能力；回傳值仍須通過共用 schema、業務驗證與 HTML sanitizer。AI 失敗時保留編輯表單原內容，不建立半成品文章。錯誤需區分設定錯誤、認證失敗、rate limit、供應商錯誤、逾時與無效輸出，但介面不得洩漏金鑰或完整上游 response。

不做跨 provider 自動 fallback，避免未經預期的資料傳輸與費用。切換 provider 只需修改 Vercel 環境變數並重新部署。後台可顯示目前 provider 名稱，但不提供線上修改金鑰。

## 7. SEO 與公開閱讀體驗

網站採內容優先、乾淨且明亮的閱讀介面。手機正文基準字級至少 18px、行高至少 1.7，桌面正文欄最大寬度 760px，互動控制的最小觸控高度 44px；不使用會妨礙閱讀的複雜動畫。

每篇公開文章必須輸出：

- 唯一 `<title>` 與 meta description。
- canonical；未自訂時使用文章正式網址。
- Open Graph 與分享圖片資料。
- `Article` JSON-LD，包含標題、摘要、作者、發布時間與更新時間。
- 唯一 H1、分類、日期與麵包屑導覽。
- 缺少封面圖時使用一致的預設社群分享圖。

站點層級輸出 `WebSite` 與 `Organization` 結構化資料、manifest、favicon 與品牌 metadata。草稿、不存在或不可公開的內容回傳正確 404，不得出現在 sitemap。

About、Contact、Privacy Policy 與 Terms 提供可直接修改的繁體中文初稿。正式發布前，管理者仍需依實際營運者、聯絡方式、資料處理與廣告政策補齊內容。

## 8. AdSense

### 8.1 策略

採「手動 AdSense slot 為主、Auto ads 預設關閉」。第一版不複製高密度廣告配置，優先兼顧閱讀體驗、Core Web Vitals 與後續調整彈性。

MVP 不判斷文章原創程度，不建立 `adsEligible` 欄位。正式公開文章可套用指定版位；`article_mid` 仍依文章結構與長度決定是否省略。

### 8.2 Placement

| Placement | 位置與條件 | MVP 狀態 |
| --- | --- | --- |
| `article_after_intro` | 導言或目錄後 | 啟用 |
| `article_mid` | 約全文 40–50%，優先置於接近 45% 的 H2 區段邊界；短文省略 | 啟用 |
| `article_end` | 正文結束、相關文章前 | 啟用 |
| `sidebar_desktop` | 文章桌面右側欄，只在 `lg` 以上顯示 | 啟用 |
| `feed_inline` | 首頁／分類頁第 4 張文章卡後 | 僅保留設定，第二階段才渲染 |

每篇文章最多三個正文廣告，加一個桌面側欄廣告。不得加入底部固定 anchor、Vignette／開屏廣告、手機版連續兩個大型矩形廣告、按圖片數量自動插入廣告或 Auto ads 自動增加正文廣告。

### 8.3 元件與設定

建立共用 `AdSlot` 元件，頁面只傳入具名 placement，例如：

```jsx
<AdSlot placement="article_mid" />
```

中央設定表負責 placement 至實際 slot ID 的映射，頁面與文章 HTML 不得含 slot ID。

```env
NEXT_PUBLIC_ADSENSE_ENABLED=false
NEXT_PUBLIC_ADSENSE_CLIENT_ID=
NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO=
NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID=
NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END=
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_DESKTOP=
NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE=
ADSENSE_PUBLISHER_ID=
```

只有同時符合下列條件時才建立廣告節點：

- AdSense 已啟用。
- Client ID 存在。
- 對應 placement 的 slot ID 存在。
- 目前路由與內容狀態允許顯示廣告。

AdSense script 僅在允許廣告的公開網站載入一次，不得在 `/admin/**`、`/login`、`/about`、`/contact`、`/privacy`、`/terms`、404、錯誤頁或草稿預覽載入。同一廣告節點不可重複初始化；載入失敗不得影響頁面。

開發環境在未啟用或未設定 slot 時可顯示淡灰色 `AdSense · placement` 預覽框。正式環境不顯示預覽、不載入 script，也不留下大片空白。

`article_mid` 由文章 renderer 顯示時插入，不修改儲存的 HTML；優先選擇接近全文 45% 的 H2 區段結束處。正文少於 1,200 個可見字元，或沒有可用 H2 邊界時，省略該 placement。這項長度檢查只控制中段廣告，不判斷內容原創程度，也不阻止 `article_after_intro` 或 `article_end` 出現在正式公開文章。

### 8.4 響應式與 CLS

廣告容器使用 `width: 100%` 並水平置中。橫幅 slot 在手機至少預留 100px、桌面至少 90px；矩形 slot 至少預留 280px。不得設定會裁切廣告的 `max-height` 或 `overflow: hidden`，也不得覆蓋文字、導覽或操作按鈕。

`sidebar_desktop` 在小於 `lg` 時不得建立可見廣告節點。MVP 不渲染 `feed_inline`。

### 8.5 核准後設定

設定有效 publisher ID 後：

1. 在允許廣告的公開頁面 `<head>` 加入 `google-adsense-account` metadata。
2. `/ads.txt` 輸出 `google.com, pub-XXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`，其中 publisher ID 由 `ADSENSE_PUBLISHER_ID` 提供。
3. AdSense 後台建立與 placement 對應的 responsive display units，且每個 placement 使用不同 slot ID。
4. 營運者設定 Google Privacy & Messaging 或其他 Google 認證 CMP。
5. 驗證 360、390、768、1280px，確認載入前後沒有明顯版面位移或水平溢出。

## 9. 錯誤處理

- CRUD 輸入驗證 slug、狀態、分類、標題、摘要、正文與 SEO 欄位。
- 發布失敗、slug 衝突與欄位錯誤使用可理解的繁體中文訊息。
- 資料庫與未預期的伺服器錯誤對使用者只回傳通用訊息，詳細內容留在 server log。
- 公開查詢一律附加 `PUBLISHED` 條件。
- 管理 API 一律驗證 session、`ADMIN_EMAILS` 白名單與資料存在性。
- AdSense 缺少單一 slot ID 時只略過該 placement，不影響其他 placement 或頁面。

## 10. 驗證策略與驗收條件

### 10.1 自動測試

自動測試至少涵蓋：

- slug 產生、正規化與重複錯誤。
- HTML sanitizer 移除 script、`ins.adsbygoogle`、event handler 與危險 URL。
- DeepSeek、OpenAI、Gemini adapter 的設定、輸出正規化與錯誤分類。
- 未登入及非白名單帳號無法存取管理能力。
- 草稿不會出現在公開查詢與 sitemap。
- canonical fallback、metadata、Open Graph 與 Article JSON-LD。
- AdSense 全域關閉、路由排除、缺少 slot、單次 script 載入與單次節點初始化。
- 公開文章最多三個正文 slot，短文章沒有 `article_mid`，手機沒有可見 sidebar slot。
- `/ads.txt` 使用 `ADSENSE_PUBLISHER_ID` 產生正確內容。

### 10.2 核心頁面

驗證下列頁面可正確呈現或依權限導向：

- 首頁。
- `/ai`、`/software`、`/social`。
- 通用分類頁與正式文章頁。
- About、Contact、Privacy Policy、Terms。
- Login 與 Admin。
- 404 與錯誤頁。

### 10.3 完成門檻

- Test suite 通過。
- ESLint 通過且沒有 error。
- Production build 通過。
- 核心頁面與基本 SEO 驗證通過。
- 關閉 AdSense 時，production HTML 不包含 AdSense script 或廣告節點。
- 缺少任一 slot ID 時只略過該 placement。
- 每頁只載入一次 AdSense script。
- `/admin/**`、登入、政策頁、404、錯誤頁及草稿預覽完全不載入廣告。
- 360、390、768、1280px 沒有水平溢出，廣告容器不覆蓋內容。

## 11. 部署需求

Vercel 必須設定 PostgreSQL、NextAuth、Google OAuth、網站網址、聯絡信箱、管理者白名單、所選 LLM provider 及其 server-only 金鑰。AdSense 所有環境變數預設為關閉或空值；未取得核准時，production 不得產生廣告 script、節點或空白版位。

Prisma migration 與三個初始分類必須提供可重複執行的部署／seed 流程。README 應列出本機開發、環境變數、資料庫初始化、測試、build 與 Vercel 部署步驟。
