# 微信公眾號文章改寫設計規格

最後更新：2026-09-07

## 1. 目標

在後台「文章生成」新增「微信公眾號改寫」模式。編輯者輸入一篇公開、免登入的微信公眾號文章連結後，系統擷取標題、封面、完整正文及正文圖片，先提供原文預覽，再依目標語言進行忠實轉譯與 SEO 優化，或選擇深度 SEO 重組。編輯者確認改寫結果後，系統才將封面與正文圖片轉存至 Cloudflare R2，最後把整理完成的內容載入既有文章編輯器，讓編輯者人工確認、儲存草稿或發布。

成功標準：

- 支援公開、免登入的 `https://mp.weixin.qq.com/s/...` 單篇文章。
- 能回歸確認標題、封面、正文與圖片是否完整取得，不以 HTTP 200 代表擷取成功。
- HTTP 擷取不完整時，自動以免登入 headless Chromium 再嘗試一次。
- 原文預覽與改寫預覽階段不把圖片上傳至 R2。
- 忠實轉譯模式保留段落順序、事實與圖片位置；深度 SEO 重組模式可以重排章節，但不可遺漏、重複或虛構圖片。
- LLM 輸出須包含可編輯的標題、slug、摘要、正文與 SEO 欄位，並進入既有 Prompt 管理與 LLM 用量紀錄。
- R2 部分失敗時只重試失敗圖片，不重複上傳已成功圖片，也不重新呼叫 LLM。
- 完成轉存後內容只載入文章編輯器，不自動建立或發布文章。
- `wechat-import-worker` 納入既有 Worker 管理頁與啟停、重啟、健康、佇列和失敗任務監控。
- 未完成、失敗或放棄的匯入資料於 24 小時後清除大型 payload。

## 2. 範圍

### 2.1 Phase 1 包含

- 單一公開微信文章 URL 匯入。
- HTTP 優先、headless Chromium 降級的擷取策略。
- 標題、封面、公眾號名稱、原作者、發佈日期、正文與圖片擷取。
- 原文安全清理、canonical block 建立與登入後預覽。
- `zh-tw`、`en`、`ja` 三種既有站內語系。
- 「忠實轉譯＋SEO」與「深度 SEO 重組」兩種模式。
- 長文切塊、圖片完整性驗證、改寫前後預覽。
- 確認後的 R2 轉存、冪等重試與文章編輯器交接。
- 後台來源溯源資料，但公開頁面不顯示來源註記。
- Worker 管理、24 小時清理、測試 fixture、可回歸 smoke 輸出。

### 2.2 Phase 1 不包含

- 登入微信、掃碼、Cookie 匯入、驗證碼破解、付費內容或其他限制繞過。
- 搜尋公眾號、抓取歷史文章列表或批次 URL 匯入。
- 自動排程匯入、自動儲存草稿或自動發布。
- 圖片內文字的 OCR、翻譯、去字、修補或重新排版。
- 閱讀數、按讚、留言、分享等互動資料。
- 在公開文章頁自動加入原始來源註記。
- 把參考專案作為 runtime dependency，或直接移植其 Python／SQLite 服務。

## 3. 參考與採用原則

### 3.1 主要參考

- [`applet0421/wechatpublicaccount`](https://github.com/applet0421/wechatpublicaccount)：參考 Extractor adapter 邊界、`#js_content`、metadata 與 script 多重 fallback、`data-src` 圖片處理、工作紀錄、版本與資產分離的做法。
- [`ar-gen-tin/wechat-article-downloader`](https://github.com/ar-gen-tin/wechat-article-downloader)：參考 Chrome CDP、滾動觸發懶載入、第二次 materialize `data-src`、圖片 Referer 與微信頁面完整性判定。該 repository 已封存，因此不作為執行期依賴。

### 3.2 整合原則

- 使用目前專案的 Next.js 16.3.4、React 19、PostgreSQL、Prisma、Zod、Sharp、Cloudflare R2 與既有 LLM execution layer。
- 微信來源特例集中在 `src/lib/wechat-import/`，不污染通用文章 repository 與一般 AI 改寫流程。
- 網頁請求只做授權、輸入驗證、建立工作與查詢狀態；外部抓取、Chromium、LLM 與批次 R2 上傳都由獨立 Worker 執行。
- 不直接複製參考 repository 的程式碼；若後續採用第三方片段，必須先確認授權並保留必要 attribution。

## 4. 使用者流程

### 4.1 入口

`/admin/posts/create` 新增第四張卡片：

- 標題：微信公眾號改寫
- 說明：輸入公開文章連結，擷取全文與圖片後翻譯、改寫及整理 SEO。
- 按鈕：開始微信文章改寫
- 連結：`/admin/posts/wechat`

### 4.2 階段一：匯入

輸入欄位：

- 微信文章 URL，必填，最多 2,048 字元。
- 目標語言，必填，使用 `zh-tw`、`en`、`ja`。

送出後建立 `WeChatImport`，畫面輪詢其狀態。相同使用者、相同正規化 URL 若已有 24 小時內且未到期的非終止工作，畫面顯示「繼續既有工作」與「重新擷取」。重新擷取建立新的 import，不覆蓋舊工作。

### 4.3 階段二：原文預覽

成功擷取後顯示：

- 原標題與封面。
- 公眾號名稱、原作者、發佈日期。
- 使用 HTTP 或 Chromium 擷取。
- 完整清理後正文與正文圖片。
- 圖片總數、成功數、失敗數、警告與錯誤清單。
- 重新擷取按鈕。

封面不存在只顯示警告。任何正文圖片未成功取得時，使用者可檢視已取得內容，但不能進入最終 R2 轉存；必須重新擷取或明確刪除該失敗圖片所在 block。刪除是使用者可見的內容編輯動作，系統不得靜默遺漏圖片。

### 4.4 階段三：改寫與比較

使用者選擇模式：

- `FAITHFUL`：忠實轉譯＋SEO，預設。保留 text/image block 順序，改寫文字但不移動圖片。
- `DEEP_SEO`：深度 SEO 重組。可重排 text/image block，但必須保留全部有效 asset ID 恰好一次。

改寫完成後顯示原文／改寫文切換預覽，以及標題、slug、摘要、SEO title、SEO description、SEO keywords、圖片完整性、待人工查證事項、模型、耗時與 token 用量。改寫結果仍未轉存 R2，也未建立 Post。

使用者可以：

- 重新執行改寫；每次都是新的明確 LLM 操作並產生新的用量紀錄。
- 切換改寫模式後重新執行。
- 返回原文預覽。
- 確認改寫並開始圖片轉存。

### 4.5 階段四：確認、轉存與編輯器

按下「確認改寫並轉存圖片」後：

1. `WeChatImport` 進入 `TRANSFER_QUEUED`。
2. Worker 將封面及仍被改寫結果引用的正文圖片逐一轉存 R2。
3. 每個資產成功後立即保存 `objectKey` 與 `publicUrl`，清除該資產的暫存 bytes。
4. 部分失敗時工作進入 `TRANSFER_FAILED`，畫面顯示成功／失敗項目並允許只重試失敗資產。
5. 全部必要資產完成後，把 canonical asset references 換成 R2 URL，產生不可再由 Worker 修改的 editor draft，工作進入 `READY`。
6. 使用者按「放入文章編輯器」，同頁顯示既有 `PostEditor`。

編輯器預填：目標語系、標題、slug、摘要、封面、正文、SEO title、SEO description、SEO keywords。分類與作者仍由使用者選擇或確認。按「儲存草稿」或「發布文章」時才建立 Post，並保存後台專用 `sourceImportId`；公開頁面不顯示原始來源 URL 或來源註記。

## 5. 系統架構

```text
Admin UI
  ├─ create/status/rewrite/transfer actions
  ├─ authenticated preview route
  └─ existing PostEditor
          │
          ▼
PostgreSQL: WeChatImport + WeChatImportAsset + LLMUsage
          ▲
          │ atomic claim + lease
wechat-import-worker
  ├─ URL policy / SSRF guard
  ├─ HTTP extractor
  ├─ Chromium fallback extractor
  ├─ HTML normalizer / asset fetcher
  ├─ LLM block rewriter
  ├─ R2 transfer
  └─ retention cleanup
```

Worker 與 Web 只透過 PostgreSQL 交換工作狀態與 payload，不依賴共用本機檔案系統。這使 Coolify／VM 多 container 部署、程序重啟與水平擴展仍可保持一致。

## 6. 資料模型

### 6.1 Enums

```prisma
enum WeChatImportStatus {
  FETCH_QUEUED
  FETCHING
  FETCHED
  REWRITE_QUEUED
  REWRITING
  REWRITTEN
  TRANSFER_QUEUED
  TRANSFERRING
  TRANSFER_FAILED
  READY
  FAILED
  UNKNOWN
  ABANDONED
  EXPIRED
}

enum WeChatRewriteMode {
  FAITHFUL
  DEEP_SEO
}

enum WeChatAssetStatus {
  STAGED
  UPLOADING
  READY
  FAILED
  REMOVED
}
```

### 6.2 `WeChatImport`

欄位：

- `id: String @id @default(cuid())`
- `userId: String` 與 `User` relation。
- `status: WeChatImportStatus @default(FETCH_QUEUED)`。
- `sourceUrl: String @db.Text`：原始輸入。
- `normalizedUrl: String @db.Text`：經 URL policy 正規化後的 URL。
- `sourceTitle: String? @db.Text`。
- `sourceAccountName: String? @db.Text`。
- `sourceAuthor: String? @db.Text`。
- `sourcePublishedAt: DateTime?`。
- `sourceCoverUrl: String? @db.Text`：只供後台溯源，不提供瀏覽器直接載入。
- `sourceContentHtml: String? @db.Text`：安全清理後、含 canonical asset references 的原文。
- `sourceBlocks: Json?`：canonical `ArticleBlock[]`。
- `sourceContentHash: String? @db.VarChar(64)`。
- `fetchMethod: String? @db.VarChar(20)`：`HTTP` 或 `CHROMIUM`。
- `targetLocale: String`。
- `rewriteMode: WeChatRewriteMode @default(FAITHFUL)`。
- `rewrittenDraft: Json?`：經 schema 驗證的改寫結果，仍含 canonical asset references。
- `editorDraft: Json?`：所有 URL 完成替換後的 immutable handoff payload。
- `failureStage: String? @db.VarChar(40)`。
- `errorCode: String? @db.VarChar(80)`。
- `errorSummary: String? @db.VarChar(500)`。
- `report: Json?`：`summary`、`success`、`failure`。
- `leaseExpiresAt: DateTime?`。
- `expiresAt: DateTime`：建立或最後一次明確使用者操作後 24 小時；`READY` 或已建立 Post 的工作不再以此刪除稽核 metadata。
- `createdAt`、`updatedAt`、`completedAt`。
- `post: Post?` 反向 relation。
- `assets: WeChatImportAsset[]`。

索引：

- `[status, createdAt]`：Worker FIFO claim。
- `[userId, updatedAt]`：後台列出工作。
- `[sourceContentHash]`：診斷重複來源。
- `[expiresAt, status]`：清理。

不對 `normalizedUrl` 設全域 unique，因同一文章允許重新擷取與不同語言／模式改寫。

### 6.3 `WeChatImportAsset`

欄位：

- `id: String @id @default(cuid())`。
- `importId: String` 與 cascade relation。
- `position: Int`：正文出現順序；封面為 `-1`。
- `isCover: Boolean @default(false)`。
- `originalUrl: String @db.Text`。
- `status: WeChatAssetStatus @default(STAGED)`。
- `mimeType: String @db.VarChar(100)`。
- `byteSize: Int`。
- `width: Int?`、`height: Int?`。
- `sha256: String @db.VarChar(64)`。
- `alt: String @db.Text`。
- `imageBytes: Bytes?`。
- `objectKey: String? @db.Text`。
- `publicUrl: String? @db.Text`。
- `attempts: Int @default(0)`。
- `errorCode: String? @db.VarChar(80)`。
- `errorSummary: String? @db.VarChar(500)`。
- `leaseExpiresAt: DateTime?`。
- `createdAt`、`updatedAt`。

Constraints 與索引：

- `@@unique([importId, position])`。
- `@@index([importId, status])`。
- `@@index([status, updatedAt])`。

### 6.4 既有模型調整

- `User.weChatImports: WeChatImport[]`。
- `Post.sourceImportId: String? @unique` 與 `sourceImport: WeChatImport?`。一個完成工作最多建立一篇 Post。
- `DataRetentionSetting.weChatImportHours: Int @default(24)`，允許管理設定保持 24 小時預設；本功能第一版 UI 不新增可調整欄位，避免擴大資料保留介面。

## 7. Canonical content contract

正文不以任意 HTML 字串直接交給 LLM。系統先建立：

```ts
type ArticleTextBlock = {
  id: string;
  type: "text";
  html: string;
};

type ArticleImageBlock = {
  id: string;
  type: "image";
  assetId: string;
  alt: string;
};

type ArticleBlock = ArticleTextBlock | ArticleImageBlock;
```

規則：

- block ID 由 import 內的穩定順序產生，不使用來源提供的 DOM id。
- 每張有效正文圖片對應一個 image block 與一個 asset；同一遠端 URL 在正文重複出現時仍保留不同 image block，但可以共用經 SHA-256 去重的 bytes。
- 封面不放入正文 blocks，透過 `isCover` asset 管理。
- 文字 block 只允許本站 sanitizer 支援的標籤與屬性。
- 對外預覽時，image block 轉為登入後 preview API URL。
- 交接編輯器時，image block 轉為 `<img src="R2_PUBLIC_URL" alt="...">`。

完整性 invariant：

- `FAITHFUL`：輸出 block ID sequence 必須與輸入完全相同；image block 內容不可由 LLM 修改。
- `DEEP_SEO`：輸出可以重排，但所有輸入 image block ID 必須恰好出現一次，且 asset ID 不可改變。
- 任一模式出現未知 ID、遺漏、重複、無效 HTML 或 schema 不符，整次改寫失敗，不保存為 `REWRITTEN`。

## 8. 擷取策略

### 8.1 URL policy 與 SSRF 防護

只接受：

- scheme 為 `https:`。
- hostname 精確等於 `mp.weixin.qq.com`。
- 無 username、password 與自訂 port。
- pathname 以 `/s/` 開頭且含文章識別內容。
- URL 長度不超過 2,048。

每次 redirect 都必須重新執行同一政策。HTTP fetcher 禁止自動無限 follow；最多五次 redirect。連線前解析 hostname，拒絕 loopback、link-local、private、multicast、unspecified IPv4/IPv6；實際連線後仍需避免 redirect 或 DNS rebinding 進入私有位址。

圖片 URL 必須為 HTTPS，通過微信圖片 hostname allowlist，且套用相同 IP 與 redirect 檢查。allowlist 集中維護並由 fixture 證明需要，不接受任意正文圖片 hostname。

### 8.2 HTTP extractor

使用固定瀏覽器 User-Agent、30 秒 deadline、2 MB HTML 上限。解析優先序：

- 正文：`#js_content`；若新版分享圖文把正文放在已知 script 欄位，使用經 fixture 驗證的 fallback。
- 標題：`#activity-name` → `og:title` → `twitter:title` → 已知 script 欄位 → `<title>`。
- 封面：已知 script `cdn_url`／`cover` → `og:image`。
- 公眾號：`#js_name` → 已知 `nick_name`／`nickname` 欄位。
- 作者：`#js_author_name` → article author metadata → 已知 script 欄位。
- 日期：頁面顯示值與已知 publish timestamp 欄位。
- 圖片：`data-src` → `src`，移除 data URI、追蹤像素與不可見圖片。

### 8.3 完整性判定與 Chromium fallback

HTTP 結果符合下列全部條件才接受：

- 有標題。
- 有 `#js_content` 或經 fixture 支援的新版正文來源。
- 清理後有非空文字或至少一張有效正文圖片。
- 頁面不符合登入、驗證、刪除、違規、不可用等已知錯誤 signature。
- DOM 圖片 references 可一一建立 asset download request。

任一條件不符即以 headless Chromium 重試。Chromium 使用獨立、無持久 Cookie 的暫時 profile，60 秒 deadline；等待 DOM ready、短暫 network idle、逐步滾動，再把所有 `img[data-src]` materialize 後抽取。完成後不保留 profile、Cookie、local storage 或頁面截圖。Chromium 結果仍需通過相同完整性與 sanitizer 規則。

### 8.4 圖片抓取限制

預設：

- 最多 100 張正文圖片，封面另計一張。
- 單圖最多 10 MB。
- 單篇暫存圖片合計最多 100 MB。
- 同時最多四個下載。
- 單圖 15 秒 deadline，最多兩次網路層 retry。
- Referer 固定使用來源文章 URL，User-Agent 與文章 request 一致。

不能只信任 URL suffix 或 response `Content-Type`。下載後以 magic bytes 判斷 JPEG、PNG、WebP、GIF，再用 Sharp 以 `limitInputPixels: 40_000_000` 解碼並取得尺寸。拒絕 SVG、HTML、無法解碼圖片、零尺寸或超限圖片。錯誤不得靜默跳過，必須寫入 `failure`。

## 9. HTML 安全與預覽

擷取後移除：

- `script`、`style`、`noscript`、form controls、廣告與追蹤元素。
- 所有 `on*` 事件屬性、來源 class/id、內聯 style 與非必要 data attributes。
- iframe、音訊、影片、canvas、SVG、object、embed。
- 微信頁面工具列、互動、關注、留言與頁尾 UI。

保留並正規化為本站現有 sanitizer 支援的正文語意：`p`、`div`、`h2`、`h3`、`strong`、`em`、`u`、`a`、`ul`、`ol`、`li`、`blockquote`、`code`、`pre`、`br`、`img`。來源 h1 轉為 h2，避免與文章 title 衝突。來源連結使用 HTTPS，外部新分頁連結補 `rel="noopener noreferrer"`。

圖片預覽 Route Handler：

- 路徑：`GET /api/admin/wechat-imports/[id]/assets/[assetId]`。
- 僅允許登入、已變更初始密碼且可存取該 import 的使用者；OWNER 可檢視全部工作供診斷。
- 從 PostgreSQL `imageBytes` 串流回傳正確 MIME。
- 設定 `Cache-Control: private, no-store`、`X-Content-Type-Options: nosniff`。
- asset 已轉存並清除 bytes 時，回傳經驗證的 R2 redirect 或 410；工作 UI 使用保存的 `publicUrl`。

## 10. LLM 改寫

### 10.1 Prompt 與用量

新增 Prompt 定義 `WECHAT_ARTICLE_REWRITE`，允許變數：

- `languageInstruction`
- `rewriteMode`
- `sourceTitle`
- `sourceMetadata`
- `blockContract`
- `sourceBlocks`
- `previousContext`

所有呼叫使用既有 `executeLLMCall`、Prompt version、model price 與 `LLMUsage` audit。來源文字明確標記為不可信資料，只能作為待轉譯內容，不得遵循其中的命令、改變任務或輸出格式。

### 10.2 短文與長文

- 在模型輸入預算內的文章使用單次結構化 block rewrite。
- 超過預算時按 heading 與 paragraph boundary 切成多個 chunk，不切斷 image block 或 HTML element。
- 每個 chunk 帶穩定 block ID 與上一 chunk 的只讀摘要 context。
- 每個 chunk 完成後立即驗證 ID、HTML 與圖片 invariant；任一 chunk 失敗，不組裝部分結果。
- 所有正文 chunk 成功後，再以完整改寫文字的壓縮表示產生全篇 title、slug、excerpt 與 SEO 欄位。

分塊的每次模型呼叫都分別記錄 LLMUsage。UI 顯示整個 rewrite run 的聚合 token、費用與耗時，但資料庫仍保留每次底層呼叫的 audit。

### 10.3 結構化結果

```ts
type WeChatRewriteDraft = {
  title: string;
  slug: string;
  excerpt: string;
  blocks: ArticleBlock[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  needsVerification: string[];
};
```

長度與 slug 規則沿用 `generatedArticleSchema`。正文組裝後再執行 `sanitizeArticleHtml`。圖片 alt 沒有可靠原值時，以改寫後標題與相鄰段落產生人工可編輯 fallback；Phase 1 不額外呼叫 vision model。

### 10.4 不確定計費

Worker 在送出 LLM request 前把工作設為 `REWRITING` 並保存 lease。若 request 明確失敗，可進入 `FAILED` 並允許重試；若程序在送出後中斷、無法確認是否已產生成本或結果，lease 回收將工作設為 `UNKNOWN`／錯誤碼 `LLM_RESULT_UNKNOWN`，不自動重送。管理員或原使用者必須明確按下重新改寫。

## 11. R2 轉存

R2 object key：

```text
wechat-imports/<import-id>/<sha256-prefix>-<asset-id>.<ext>
```

規則：

- 使用既有公開圖片 bucket 與 `R2_PUBLIC_BASE_URL`。
- 後端直接上傳暫存 bytes，不建立前端 presigned PUT。
- MIME 與副檔名使用已驗證的實際格式。
- `Cache-Control: public, max-age=31536000, immutable`。
- object key 固定，因此同一 asset retry 不會產生額外物件。
- 上傳前以原子 update 將 asset 從 `STAGED`／`FAILED` claim 為 `UPLOADING` 並設定 lease。
- 成功後保存 `READY`、`objectKey`、`publicUrl`，清除 `imageBytes`。
- 失敗後保存 `FAILED` 與可顯示錯誤；bytes 保留至成功或 24 小時到期。
- import 只有在所有仍被 draft 引用的 assets 都為 `READY` 時才能轉為 `READY`。
- Phase 1 不自動刪除已成功上傳但最後未發布的 R2 圖片，避免移除仍被未儲存 editor draft 使用的資產；其清理另列後續資產管理功能。

## 12. 狀態機與重試

合法主流程：

```text
FETCH_QUEUED -> FETCHING -> FETCHED
FETCHED -> REWRITE_QUEUED -> REWRITING -> REWRITTEN
REWRITTEN -> REWRITE_QUEUED
REWRITTEN -> TRANSFER_QUEUED -> TRANSFERRING -> READY
TRANSFERRING -> TRANSFER_FAILED -> TRANSFER_QUEUED
```

例外：

- 可明確確認未產生成本的階段失敗進入 `FAILED`，保存 `failureStage`，按重試後回到對應 queued 狀態。
- 無法確認 LLM 結果或計費的中斷進入 `UNKNOWN`，不自動 retry。
- 使用者放棄進入 `ABANDONED`，不影響已建立的 Post。
- 到期進入 `EXPIRED`，清除大型 payload 後不可恢復。
- 已存在 Post relation 的 import 不允許重新交接另一篇 Post。

每個處理步驟使用 compare-and-set status 與 `leaseExpiresAt` claim，避免多 Worker 重複執行。恢復規則：

- `FETCHING` lease 到期：回到 `FETCH_QUEUED`。
- `REWRITING` lease 到期：進入 `UNKNOWN`。
- `UPLOADING` asset lease 到期且 bytes 存在：回到 `FAILED`，可重試上傳。
- `TRANSFERRING` import 若所有 assets 已 READY：完成組裝並進入 READY；否則進入 TRANSFER_FAILED。

## 13. API 與 Server Actions

Next.js 16 實作前須閱讀 repository 內：

- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`

Server Actions：

- `createWeChatImportAction({ sourceUrl, targetLocale, forceNew })`
- `queueWeChatRewriteAction({ importId, mode })`
- `queueWeChatTransferAction({ importId })`
- `retryWeChatImportAction({ importId })`
- `abandonWeChatImportAction({ importId })`

所有 action 重新取得目前使用者、拒絕未登入或 `mustChangePassword`，並檢查 import ownership；OWNER 的跨使用者操作只允許 Worker 管理 retry，不允許把其他人的 import 載入自己的 PostEditor。

Route Handlers：

- `GET /api/admin/wechat-imports/[id]`：回傳 `WeChatImportView` 供輪詢。
- `GET /api/admin/wechat-imports/[id]/assets/[assetId]`：登入後圖片預覽。

`WeChatImportView` 不包含 `imageBytes`、原始 HTML、R2 credentials、LLM 原始 provider response 或內部 stack。它包含目前階段、進度、預覽需要的安全內容、可用操作、錯誤碼與 report。

## 14. Worker 管理

新增 worker：

- ID：`wechat-import-worker`
- Name：`WeChat import worker`
- entrypoint：`scripts/wechat-import-worker.ts`
- npm script：`worker:wechat-imports`

`/admin/worker` 新增：

- Worker 健康卡：執行中、心跳逾時、離線、已停用。
- 最近啟動、最近心跳、累計處理、最近錯誤。
- 擷取、改寫、轉存各階段 queued／running／failed 數量。
- 最近工作分頁，顯示來源標題、URL、fetch method、圖片進度、模型、狀態、錯誤碼與合法重試操作。
- 啟用、停用與要求重啟。

既有 hard-coded worker control 改為 registry：每個 worker 宣告 ID、名稱、可顯示 metrics 與允許動作。控制仍僅限 OWNER。

重啟契約：

1. 管理 action 將 `desiredState` 設為 `RESTART_REQUESTED`。
2. Worker 完成當前不可分割的資料庫更新，停止 claim 新工作。
3. Worker 原子地把自己的 desiredState 改回 `RUNNING` 後退出。
4. Docker `restart: unless-stopped` 啟動新程序並更新 `startedAt`。

停用只停止 claim 新工作，不中斷正在進行的 LLM 或上傳呼叫；完成目前步驟後進入等待。這避免產生更多 UNKNOWN 工作。

## 15. 錯誤碼

穩定錯誤碼：

- `INVALID_URL`
- `SOURCE_LOGIN_REQUIRED`
- `SOURCE_VERIFICATION_REQUIRED`
- `SOURCE_DELETED`
- `SOURCE_ACCESS_DENIED`
- `FETCH_TIMEOUT`
- `FETCH_REDIRECT_REJECTED`
- `BODY_MISSING`
- `CONTENT_INCOMPLETE`
- `HTML_LIMIT_EXCEEDED`
- `ASSET_LIMIT_EXCEEDED`
- `ASSET_HOST_REJECTED`
- `ASSET_DOWNLOAD_FAILED`
- `ASSET_TYPE_INVALID`
- `ASSET_DECODE_FAILED`
- `LLM_FAILED`
- `LLM_RESULT_UNKNOWN`
- `LLM_OUTPUT_INVALID`
- `IMAGE_SET_MISMATCH`
- `R2_UPLOAD_FAILED`
- `IMPORT_EXPIRED`

UI 顯示本地化、可操作訊息；資料庫保存穩定 code 與不超過 500 字元、已去除秘密的摘要。外部 response body、URL query 中的未知 token、Cookie、authorization header、stack trace 不進入 UI 或一般 application log。

## 16. Report contract

每次擷取、改寫與轉存更新：

```ts
type WeChatImportReport = {
  generated_at: string;
  summary: {
    stage: "fetch" | "rewrite" | "transfer";
    status: "success" | "failure" | "partial";
    fetchMethod?: "HTTP" | "CHROMIUM";
    title?: string;
    contentCharacters?: number;
    expectedImages?: number;
    successfulImages?: number;
    failedImages?: number;
  };
  success: Array<{
    code: string;
    item: string;
    detail?: string;
  }>;
  failure: Array<{
    code: string;
    item: string;
    retryable: boolean;
    detail: string;
  }>;
};
```

Smoke artifact 存於 `docs/wechat-import-smoke.summary.json`，其 `generated_at` 是執行日誌版本基準。操作文件同時記錄命令、fixture 或公開測試 URL 的去敏識別、預期與實際結果。

## 17. 清理與保留

既有 retention cycle 增加微信匯入清理：

- `expiresAt <= now` 且未建立 Post 的 `FETCHED`、`REWRITTEN`、`FAILED`、`UNKNOWN`、`TRANSFER_FAILED`、`ABANDONED` 工作進入 `EXPIRED`。
- 清除 `sourceContentHtml`、`sourceBlocks`、`rewrittenDraft`、`editorDraft`、asset `imageBytes` 及來源圖片完整 URL query；保留 import ID、使用者、來源 hostname、內容 hash、時間、狀態、error code、精簡 report 與已完成 R2 對照。
- queued/running 工作只有在 lease 已到期後才可清理。
- 已關聯 Post 的 import 保留後台 provenance metadata；大型 payload 仍於交接或建文後清除。
- cleanup 固定產出掃描、到期、清除與失敗數，沿用現有 retention 測試與日誌方式。

## 18. 部署

### 18.1 Container

Dockerfile 拆出共用 build/app runtime 與微信 Worker runtime target。只有微信 Worker target 安裝系統 Chromium 與 `playwright-core` runtime dependency；一般 Web、AI image worker、cache invalidator 與 database backup worker 不包含 Chromium。

### 18.2 Compose

`docker-compose.vm.yml` 與 `docker-compose.coolify.yml` 新增：

```yaml
wechat-import-worker:
  build:
    context: .
    target: wechat-worker-runtime
  restart: unless-stopped
  env_file:
    - path: .env.production
      required: false
  environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://...
    DIRECT_URL: postgresql://...
    WECHAT_CHROMIUM_PATH: /usr/bin/chromium
  command: ["npm", "run", "worker:wechat-imports"]
  depends_on:
    build:
      condition: service_completed_successfully
  networks:
    - internal
```

Worker 需要與 Web 相同的資料庫、LLM、Prompt pricing 與 R2 環境變數。Chromium 以非 root user、`--no-first-run`、獨立 temp profile 執行；只有在 container sandbox 無法啟動且部署文件明確說明時才使用必要的最小 flags。

## 19. 檔案邊界

新增：

- `src/lib/wechat-import/types.ts`
- `src/lib/wechat-import/schema.ts`
- `src/lib/wechat-import/url-policy.ts`
- `src/lib/wechat-import/http-extractor.ts`
- `src/lib/wechat-import/browser-extractor.ts`
- `src/lib/wechat-import/parse-wechat-html.ts`
- `src/lib/wechat-import/normalize-content.ts`
- `src/lib/wechat-import/asset-fetcher.ts`
- `src/lib/wechat-import/repository.ts`
- `src/lib/wechat-import/state-machine.ts`
- `src/lib/wechat-import/rewrite.ts`
- `src/lib/wechat-import/r2-transfer.ts`
- `src/lib/wechat-import/worker.ts`
- `src/lib/wechat-import/cleanup.ts`
- `src/lib/wechat-import/report.ts`
- `src/app/(backoffice)/admin/posts/wechat/page.tsx`
- `src/app/(backoffice)/admin/posts/wechat/actions.ts`
- `src/app/api/admin/wechat-imports/[id]/route.ts`
- `src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.ts`
- `src/components/admin/wechat-import-workbench.tsx`
- `src/components/admin/wechat-source-preview.tsx`
- `src/components/admin/wechat-rewrite-review.tsx`
- `scripts/wechat-import-worker.ts`
- `prisma/migrations/<timestamp>_add_wechat_imports/migration.sql`
- `docs/wechat-public-account-rewrite.md`
- `docs/wechat-import-smoke.summary.json`

修改：

- `prisma/schema.prisma`
- `prisma/seed.ts` 或 prompt migration SQL
- `package.json`、`package-lock.json`
- `Dockerfile`
- `docker-compose.vm.yml`
- `docker-compose.coolify.yml`
- `src/app/(backoffice)/admin/posts/create/page.tsx`
- `src/components/admin/post-editor.tsx`
- `src/lib/ai/prompt-definitions.ts`
- `src/lib/ai/types.ts` 或新增專用 editor draft type
- `src/app/(backoffice)/admin/worker/page.tsx`
- `src/app/(backoffice)/admin/worker/actions.ts`
- `src/lib/retention/cleanup.ts`
- `src/lib/retention/settings.ts`
- `README.md`
- `docs/test-log.md`
- `docs/project-status.md`

每個新模組有對應同目錄 unit test；UI 與 route 使用相鄰 `.test.tsx`／`.test.ts`；端到端流程放入 Playwright tests。

## 20. 測試策略

### 20.1 Parser fixtures

fixture 必須涵蓋：

- 標準 `#js_content` 文章。
- `data-src` 懶載入與 query 帶 `wx_fmt` 圖片。
- `og:image` 與 script cover fallback。
- 新版分享圖文／貼圖文章的已知 script 格式。
- 無封面但正文完整。
- 重複圖片 URL、空 alt、隱藏追蹤像素。
- 登入、驗證、已刪除、違規與空白頁面。
- 惡意 script、事件屬性、iframe 與 prompt injection 文字。

fixture 必須是最小化、去識別、可提交的 HTML，不保存真實文章全文或敏感 token。

### 20.2 Unit tests

- URL normalization、redirect 與私網拒絕。
- metadata fallback 優先序。
- HTML sanitizer、block ID、圖片位置與重複規則。
- MIME magic bytes、Sharp decode、大小與數量上限。
- `FAITHFUL`／`DEEP_SEO` image invariant。
- schema、錯誤碼與 report 格式。
- R2 object key 與 URL replacement。
- 24 小時到期判定。

### 20.3 Database／Worker integration tests

- 原子 claim 只允許一個 Worker 取得工作。
- FETCH lease 回復。
- REWRITE 中斷進入 UNKNOWN，不能自動重新計費。
- R2 部分成功後只重試失敗資產。
- 相同按鈕重複提交不建立重複 transfer。
- READY 後清除 bytes 並建立有效 editor draft。
- expired 工作清除 payload、保留精簡 report。
- Worker start／stop／restart requested 與 heartbeat。

### 20.4 Component／Route tests

- 新入口卡片。
- 匯入四階段與頁面重整恢復。
- 原文預覽與未完整圖片 gate。
- 改寫模式、比較、錯誤與 retry。
- 圖片 Route Handler 的 401、403、404、410、ownership、headers。
- PostEditor 正確接收封面與所有欄位。
- Worker 管理卡、metrics、OWNER 權限與合法操作。

### 20.5 E2E 與 smoke

CI 使用本機受控 fixture HTTP server、fake LLM 與 fake R2，分別驗證 HTTP 成功與 Chromium fallback；不把微信即時可用性列為 CI gate。

正式 smoke 使用編輯者有權處理的公開文章，依序驗證：擷取、原文圖片數、改寫、圖片 invariant、R2 URL、editor handoff、草稿保存。輸出 `docs/wechat-import-smoke.summary.json`，並在 `docs/test-log.md` 記錄執行日期、版本、命令、用例與外部環境限制。

## 21. 分期交付

### Phase A：安全擷取核心

- Prisma 模型、migration、URL policy、HTTP parser、canonical blocks、asset validation、fixture 與 report。
- 可用測試或 CLI 對 fixture 產出穩定 `summary`／`success`／`failure`。

### Phase B：持久化 Worker 與原文預覽

- Worker claim／lease／recovery、Chromium fallback、建立與查詢 actions、登入後圖片預覽、原文 UI、Worker 管理與 Compose service。
- 可在服務重啟後恢復擷取並顯示完整原文預覽。

### Phase C：LLM 轉譯與 SEO

- Prompt definition、短文／長文 block rewrite、兩種模式、用量 audit、UNKNOWN 保護、比較 UI。
- 可證明圖片 invariant、schema 與 token usage。

### Phase D：R2 與編輯器交接

- 資產上傳狀態、冪等 key、部分失敗 retry、URL replacement、editor draft 與 Post relation。
- 可從已確認改寫結果進入完整 PostEditor，不自動保存或發布。

### Phase E：清理、端到端與營運文件

- 24 小時 retention、安全回歸、E2E、正式 smoke、README、操作文件、測試紀錄與 project status。
- 完成部署、復原、限制與人工驗收說明。

## 22. 驗收條件

- 公開標準文章能取得標題、正文、封面與全部可取得圖片。
- HTTP fixture 不完整時確實走 Chromium，且 report 記錄 `CHROMIUM`。
- 登入或驗證頁回傳穩定錯誤，不嘗試繞過。
- 原文預覽不 hotlink 微信圖片，也不提前上傳 R2。
- 忠實模式的 image block sequence 與原文一致。
- 深度模式的 image ID 集合完全一致且每張恰好一次。
- 長文分塊後沒有缺段、重複段或破壞 HTML。
- 每次 LLM 呼叫可在 LLM 用量頁查到；不確定結果不自動重試。
- 確認後才開始 R2；部分失敗可重試且不重新處理成功項目。
- editor draft 的封面與正文圖片全部使用 R2 URL。
- 進入 PostEditor 後仍需人工選擇／確認分類與作者，再按草稿或發布。
- 公開文章頁沒有自動來源註記。
- Worker 管理頁可查看健康、metrics、任務與合法控制動作。
- 未完成／放棄工作 24 小時後清除大型 payload。
- unit、integration、component、E2E、typecheck、lint、production build 全部通過；真實微信／LLM／R2 smoke 另列實際結果，不以 mock 冒充正式整合驗收。

## 23. 已知風險與決策

- 微信 DOM 與反自動化行為可能變動：以 adapter、fixture、完整性 gate、HTTP／Chromium 雙路徑與穩定 error code 降低影響。
- Chromium 增加映像與記憶體：限定於獨立 Worker image，不影響 Web runtime。
- PostgreSQL 暫存圖片增加資料庫壓力：限制單圖與總量、成功即清除 bytes、未完成 24 小時清理。
- 長文多次 LLM 呼叫提高費用：在 UI 顯示用量，按 block 切分並避免失敗後自動重做已成功但可能計費的操作。
- R2 已上傳但文章未發布會形成孤兒資產：Phase 1 優先避免誤刪；後續另建引用掃描與資產清理功能。
- 改寫內容的使用權由操作人員確認：系統只處理公開免登入 URL，不代表授予重製或發布權利；產品不自動發布，也保留後台 provenance 供稽核。
