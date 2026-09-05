# AI 配圖

最後更新：2026-09-05

文章編輯器「上傳圖片」旁的 AI 配圖按鈕，使用最新未儲存標題及正文。先分析出可修改的 Prompt、alt 草稿與插入段落，再生成單張圖片、上傳 R2、校對 alt，最後由編輯者預覽並插入正文。不自動儲存或發布文章。

## 設定與啟用

`.env`（Next.js 的 `.env.local` 同名值優先）：

```dotenv
GEMINI_API_KEY=填入有付費圖片模型權限的金鑰
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
GEMINI_IMAGE_SIZE=512
GEMINI_IMAGE_ASPECT_RATIO=9:16
```

圖片規劃沿用 `LLM_PROVIDER` 與既有文字模型。`IMAGE_PLAN` 會在規劃配圖時同時產生符合文章情境的 prompt 與 alt；圖片生成階段只呼叫 `IMAGE_GENERATE`，不再另外呼叫模型校對 alt，以避免重複成本與改寫已確認的 SEO 文字。

尺寸支援 `512`、`1K`、`2K`、`4K`，大小寫必須符合。比例支援 `1:1`、`1:4`、`1:8`、`2:3`、`3:2`、`3:4`、`4:1`、`4:3`、`4:5`、`5:4`、`8:1`、`9:16`、`16:9`、`21:9`。以上是 Nano Banana 2 參數；更換其他模型時，管理員須選擇該模型支援的組合。

`512` 是原生解析度等級，不是固定長邊；官方表格 512 + 9:16 對應 384 × 688。圖片轉 WebP（品質85），不縮放、不裁切，保存實際 width/height。回應選擇 final image，忽略 thought 圖片。

沿用既有 R2 設定：`CLOUDFLARE_R2_ACCOUNT_ID`、`CLOUDFLARE_R2_BUCKET`、`CLOUDFLARE_R2_ACCESS_KEY_ID`、`CLOUDFLARE_R2_SECRET_ACCESS_KEY`、`R2_PUBLIC_BASE_URL`。由後端上傳，瀏覽器不經過 base64 圖片傳輸；URL 路徑為 `ai-images/<job-id>.webp`。

啟用順序（遠端 migration／部署遵循 README 的確認規則）：

```bash
npm install
npm run db:migrate
npm run prisma:generate
npm run worker:images
```

另行執行網站 dev/start。正式環境需要一個有相同環境設定、可連 PostgreSQL/R2/Gemini 的常駐 Node worker，以 process supervisor 管理重啟。請勿將持續 polling worker 當成短生命週期的 serverless route。沒有 worker 時任務維持等待中；資料庫任務本身不會執行。變更 `.env` 後需重啟網站與 worker；既有方案保留建立時的模型／尺寸／比例，需重新分析以採用新設定。

## 狀態與復原

PLANNED → QUEUED → GENERATING → GENERATED → UPLOADING → READY。

- 生成按鈕使用資料庫原子狀態切換；重送同一任務不會再次生圖。
- 圖片生成後先將原始 bytes 持久化 PostgreSQL，再上傳 R2。上傳失敗保留 bytes，使用「重試上傳」而不重新付費生圖。READY 後清除暫存 bytes。
- Worker 領取租約為4分鐘；中斷於 GENERATING 標記 UNKNOWN，不自動重生，須查核費用後再決定是否建立新方案。上傳租約過期可重新使用既有 bytes。
- `IMAGE_PLAN` 產生的 alt 會隨任務保存，圖片完成後直接沿用；編輯者仍可在插入前人工修改。
- sessionStorage 記錄目前頁面任務；同一分頁重新整理可恢復。未儲存文章文字不會因此自動保存。READY 任務恢復後必須重新選段落。
- 插入採段落元素與內容比對，段落變更／刪除時保留圖片、要求重選位置。圖片只加入編輯器，不覆蓋其他正文。
- FAILED／UNKNOWN 任務及未採用的 R2 圖片保留，以便查核；本版不自動刪除可能仍在未儲存草稿中引用的圖片。失敗圖片 bytes 與未採用資產需管理員後續清理。

## 用量

規劃、生成、alt 校對分別記錄 Prompt 版本與用量。圖片 Token 按圖片費率、其他輸出 Token（含 thinking）按文字輸出費率計算；缺少 Token 分類或圖片費率時顯示無法估算。初始化 Nano Banana 2 每百萬 input/text-output/image-output tokens 費率0.50/3/60 USD；可在 LLM 用量管理修改。費率是2026-09-05查詢快照，實際帳單以供應商為準。

## 驗證

隔離 PostgreSQL：`127.0.0.1:55439/onewiki_test`；不得將整套測試指向正式資料庫。

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:55439/onewiki_test DIRECT_URL=postgresql://postgres@127.0.0.1:55439/onewiki_test npm test
npx tsc --noEmit
npm run lint
```

驗收包含：原生參數、thought 圖片排除、圖片解碼、無圖片／拒絕／逾時、費率分類、權限、跨站請求、重複生成、上傳失敗重試、租約回復、段落變更保護、恢復方案與未儲存文章值。真實付費 Gemini/R2 生圖待提供 Gemini 金鑰並啟用 migration/worker 後驗證。

參考：
- https://ai.google.dev/gemini-api/docs/generate-content/image-generation
- https://ai.google.dev/gemini-api/docs/pricing
- https://developers.google.com/search/docs/appearance/google-images

### 2026-09-05 執行結果

- 隔離資料庫完整測試：71 個測試檔、269 項測試通過。
- TypeScript 與 ESLint 通過。
- 隔離副本 Next.js 16.3.4 `next build --webpack` 正式建置通過。
- 新空白資料庫 migration 及 schema 差異檢查通過。
- `npm run worker:images -- --once` 空佇列啟動與結束通過。
- 尚未執行真實 Gemini 付費生圖／R2 整合測試：目前缺 GEMINI_API_KEY，遠端 migration 尚待確認。
- 瀏覽器視覺驗收未完成：Mac 鎖定；前端互動已由 DOM 測試驗證。
