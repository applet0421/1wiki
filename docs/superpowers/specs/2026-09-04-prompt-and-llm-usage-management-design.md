# Prompt 與 LLM 用量管理設計

最後更新：2026-09-04

## 背景與目標

1Wiki 後台目前將四種 LLM 呼叫的 Prompt 寫在程式碼中，也沒有集中保存 token、成本與執行狀態。這使 Prompt 調整必須重新部署，且管理員無法回答各功能用了多少資源、哪個模型失敗或一段期間花費多少。

本次變更要讓 `OWNER` 能在後台管理每一個 LLM 呼叫所使用的 Prompt，修改後立即套用，同時建立可篩選、可追溯的 LLM 用量與估算成本紀錄。Phase 1 包含目前四個功能：

- 一般文章生成
- 文章改寫
- 來源內容分析
- 依分析主題生成文章草稿

## 成功條件

- 所有既有 LLM 呼叫均從資料庫取得已啟用的 Prompt 版本，不再直接依賴寫死的 Prompt 文字。
- `OWNER` 可建立 Prompt 新版本、立即啟用並回復任一歷史版本。
- 無效範本在儲存時被拒絕，不會等到 LLM 呼叫時才失敗。
- 每次成功與失敗呼叫都有可追溯紀錄，並關聯當時的功能與 Prompt 版本。
- 支援的供應商回傳 token 時，系統能保存輸入、輸出與總 token。
- 已設定模型費率時，系統能以呼叫當下的費率估算美元成本；歷史成本不因後續調價而改變。
- `EDITOR` 看不到入口，且無法透過直接網址、Server Action 或資料存取繞過權限。
- 既有 AI 生成與改寫流程的輸出行為維持相容。

## 非目標

- 不提供 Prompt A/B 測試、排程發布、跨環境同步或審批工作流。
- 不保存文章全文、完整模型回覆或 API key 到用量紀錄。
- 不依靠自行估算字數來虛構 token；供應商未回傳時保留未知狀態。
- 不整合外部 LLM Gateway 或第三方 Prompt 管理服務。
- 不自動從網路同步最新模型費率；費率由 `OWNER` 明確維護。

## 權限模型

「Prompt 管理」與「LLM 用量」僅限 `OWNER`。保護必須落在三層：

1. `AdminNav` 只對 `OWNER` 顯示入口。
2. 頁面載入時驗證登入狀態、強制改密碼狀態及角色。
3. 所有會讀寫 Prompt、版本或費率的 Server Action 與 repository 方法再次驗證角色。

未登入者沿用既有登入導向；已登入但非 `OWNER` 的使用者收到一致的拒絕結果，不洩漏管理資料。

## 資料模型

### PromptDefinition

代表一個穩定的 LLM 功能，而非一段可被覆寫的文字。

- `id`
- `key`：不可變且唯一，例如 `ARTICLE_GENERATE`
- `name`
- `description`
- `allowedVariables`：JSON 字串陣列
- `requiredVariables`：JSON 字串陣列
- `activeVersionNumber`
- `createdAt`
- `updatedAt`

### PromptVersion

每次儲存建立不可變版本。

- `id`
- `promptDefinitionId`
- `versionNumber`：在同一 Prompt 內唯一並單調遞增
- `systemTemplate`
- `userTemplate`
- `createdById`
- `createdAt`

`PromptDefinition` 的 `activeVersionNumber` 與版本新增或回復必須在同一交易中更新。編輯畫面提交其載入時的 active version；若資料庫已被其他人更新，回傳版本衝突，不靜默覆蓋。

### LLMModelPrice

描述供應商與模型目前使用的費率。

- `id`
- `provider`
- `model`
- `inputUsdPerMillionTokens`
- `outputUsdPerMillionTokens`
- `effectiveAt`
- `createdById`
- `createdAt`

同一供應商與模型可保留歷史費率；呼叫時選取 `effectiveAt` 不晚於開始時間的最新一筆。

### LLMUsage

每次 LLM 請求一筆，不論成功或失敗。

- `id`
- `promptDefinitionId`
- `promptVersionId`
- `provider`
- `model`
- `status`：`SUCCESS` 或 `FAILURE`
- `inputTokens`、`outputTokens`、`totalTokens`：可為空
- `durationMs`
- `errorSummary`：可為空且限制長度
- `inputUsdPerMillionTokensSnapshot`：可為空
- `outputUsdPerMillionTokensSnapshot`：可為空
- `estimatedCostUsd`：可為空
- `createdAt`

token 數量使用整數；費率與成本使用 Prisma/PostgreSQL decimal，避免浮點誤差。用量紀錄不保存 API key、文章全文、來源全文、完整 Prompt 或完整模型回覆。

## Prompt 範本規則

範本變數使用 `{{variableName}}`。每個 Prompt 的允許與必填變數由 `PromptDefinition` 宣告。

儲存時執行以下驗證：

- system 與 user 範本至少有一者非空，user 範本不得為空。
- 每個變數均在允許清單內。
- 所有必填變數至少出現一次。
- 不接受未閉合或空白的變數標記。
- 提交的基準版本必須仍是目前啟用版本。

執行時僅替換已宣告變數，值一律視為資料，不解析成第二層範本。變數值可包含大括號而不觸發遞迴替換。既有 JSON schema、資料驗證與安全 HTML 清理仍保留在程式碼中，避免管理員透過 Prompt 編輯破壞伺服器端輸出契約。

資料庫 migration 會為四個既有 Prompt 建立第一版定義與版本。部署後不存在「先進後台手動建立 Prompt 才能恢復 AI 功能」的空窗。

## LLM 執行流程

所有 AI 功能透過共用執行流程：

1. 解析目前 AI provider 與 model 設定。
2. 依功能 key 取得 PromptDefinition 及其啟用版本。
3. 驗證呼叫端提供的變數並產生 system/user Prompt。
4. 記錄開始時間並呼叫對應 provider adapter。
5. provider adapter 回傳正規化後的內容與 usage metadata。
6. 依供應商與模型取得當下有效費率，計算並保存快照成本。
7. 寫入成功用量紀錄，再交由既有 schema parser 與內容清理流程處理。
8. 若呼叫或解析失敗，盡力寫入失敗紀錄後重新拋出既有友善錯誤。

一次呼叫開始後會固定使用已載入的 PromptVersion。管理員在呼叫期間啟用新版，不影響已開始的請求。

用量記錄失敗不得掩蓋原始 LLM 結果或錯誤；伺服器應記錄可診斷的內部錯誤，但不向使用者暴露敏感資訊。

## Provider 用量正規化

三個 provider adapter 保留各自 API 格式，但統一回傳：

- `data`：供既有 parser 使用的輸出資料
- `usage.inputTokens`
- `usage.outputTokens`
- `usage.totalTokens`

OpenAI、Gemini 與 DeepSeek 分別從其原生 response usage 欄位映射。某欄位不存在時保留 `null`；只有在能由其他已回傳欄位確定推導時才補值，例如 input 與 output 均存在時可計算 total。

## 成本計算

若 input/output token 與兩種費率都存在：

`estimatedCostUsd = inputTokens × inputRate / 1,000,000 + outputTokens × outputRate / 1,000,000`

計算與儲存均使用 decimal。任何必要資料缺少時，`estimatedCostUsd` 保存為 `null`，介面顯示「無法估算」。未知模型不會阻止 LLM 呼叫。

## 管理介面

### 導覽

在「分類」後加入「Prompt 管理」與「LLM 用量」，僅 `OWNER` 可見；既有「帳號」與「密碼」行為不變。窄畫面延續目前可橫向捲動的導覽。

### Prompt 管理

`/admin/prompts` 顯示所有定義的名稱、功能 key、啟用版本與最後修改時間。`/admin/prompts/[key]` 提供：

- system 與 user 範本編輯器
- 允許及必填變數提示
- 使用安全範例值進行的代入預覽
- 儲存為新版本並立即啟用
- 版本歷史與回復按鈕
- 成功、驗證失敗與版本衝突回饋

回復舊版本不修改舊資料，而是將該歷史內容複製成新的遞增版本並啟用，讓事件順序完整可追溯。

### LLM 用量管理

`/admin/llm-usage` 預設顯示最近 30 天，包含：

- 總呼叫數
- 成功率
- 輸入 token
- 輸出 token
- 估算美元成本

篩選支援開始日期、結束日期、功能、provider、model 與狀態。逐筆表格顯示時間、功能、Prompt 版本、provider/model、狀態、token、耗時、估算成本與精簡錯誤；表格可橫向捲動。

同頁費率區可新增供應商、模型、輸入費率、輸出費率與生效時間。新增費率只影響後續呼叫，不重算歷史用量。

## 錯誤處理

- Prompt 不存在或沒有有效版本屬於伺服器設定錯誤，對管理端回傳明確但不敏感的訊息。
- 範本驗證錯誤與版本衝突顯示在表單附近，保留使用者尚未儲存的內容。
- Provider、逾時、HTTP、輸出解析與 schema 驗證錯誤維持既有使用者訊息，並寫入失敗用量。
- `errorSummary` 只保存分類與經截斷/清理的訊息，不保存 request body、headers 或回覆本文。
- 用量落庫失敗會進入伺服器錯誤日誌，但不把成功的模型回覆改判為失敗，也不覆蓋原始 provider 錯誤。

## 測試策略

實作採測試先行，至少包含：

- Prompt 變數抽取、未知變數、缺少必填變數、非遞迴替換與預覽。
- 新版本建立、啟用、回復、並行版本衝突與不可變歷史。
- `OWNER`/`EDITOR` 導覽、頁面與 action 權限。
- OpenAI、Gemini、DeepSeek 原生 usage response 的正規化與缺欄位情況。
- decimal 成本計算、未知費率與費率快照。
- 成功、provider 失敗、解析失敗與用量落庫失敗流程。
- 用量日期/功能/provider/model/狀態篩選與彙總。
- Prompt 列表、編輯、歷史，以及用量 KPI、表格與費率表單的畫面測試。
- 既有 AI 文章生成、改寫、來源分析與草稿生成回歸測試。

完成前執行完整 `npm test`、`npm run lint`、`npm run build`，並在本機瀏覽器以 `OWNER` 驗證兩個入口、Prompt 編輯/回復、費率新增與用量篩選。若測試資料環境允許，再以 `EDITOR` 驗證入口隱藏與直接存取拒絕。

## 交付與相容性

Prisma migration 同時新增 schema、索引及四個初始 Prompt。應先部署 migration 再啟動新版應用。既有 provider/model/API key 仍由環境變數控制；本功能不在資料庫保存憑證，也不改變公開網站路由。

主要索引涵蓋：Prompt key、Prompt 版本唯一鍵、用量時間、狀態、provider/model 與功能，以支援預設 30 日彙總和篩選。第一版採伺服器端查詢與分頁，不一次載入全部歷史紀錄。
