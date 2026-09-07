# 微信擷取相容性回歸

最後更新：2026-09-08

## 五步驟操作介面（2026-09-08）

- 流程：輸入連結 → 確認原文 → 設定改寫 → 審閱結果 → 完成匯入／文章編輯器。切換已可查看的步驟不建立工作、不重送模型。
- 原文及改寫內容依 block 順序顯示完整圖文；支援改寫／原文／對照。伺服器先清理 HTML，頁面只序列化圖片 metadata，圖片二進位透過驗證登入、所有權、期限的私有 no-store 端點提供。
- 審閱頁可調整標題、摘要、SEO 字串及選擇既有圖片為封面。確認轉存時以 revision、狀態、所有權及期限做原子更新，正文區塊不由瀏覽器傳入覆寫。
- 改寫設定可指定語言、模式及 2000 字以內補充要求；重新生成需確認模型用量，上一版 DB 草稿保留到新結果成功。未提交的手動欄位變更只留在目前頁面，畫面已提示。
- 畫面與 server action、Worker 均檢查 30 分鐘期限；每秒倒數、10／5 分鐘提醒，過期提供重新匯入，不因前端仍留在舊頁而允許新模型呼叫。
- Worker 等待、離線、失敗階段、圖片實際轉存張數與未知模型結果分別顯示；放棄與再次呼叫模型需確認。R2 轉存與發佈仍需使用者操作。
- 自動回歸：17 檔 45 項微信相關測試通過；包括私有图片端點、舊期限拒絕、過期排隊不執行、草稿保留、封面歸屬、revision 及重複送出防護、完整預覽、無副作用切步與到期畫面。
- 實際瀏覽器：已檢查現有匯入的完整改寫內容、原文對照、返回設定及自然到期後重新匯入入口；窄視窗已確認 document scrollWidth 等於 viewport width。修正僅限微信頁面的後台主區寬度，不改其他後台頁面。
- 限制：沒有為本次 UI 驗證額外付費改寫、上傳 R2 或發佈；完成／重試流程以測試隔離外部服務驗證。簡體字提示為保守啟發式提醒，非完整語言校正或事實查核。
- 最終驗證：全站 `npx vitest run`，140 檔 435 項通過；`npx tsc --noEmit`、本次修改範圍 ESLint 與 `git diff --check` 通過。測試環境仍出現既有 pg client.query 併發呼叫棄用警告，不影響本次測試結果。

## 暫存期限更新（2026-09-08）

- 資料庫抓取暫存改為匯入建立後 30 分鐘到期。新工作寫入 30 分鐘 `expiresAt`；舊工作亦以 `createdAt + 30 分鐘` 判斷，不延長操作期限。
- 微信 Worker 每分鐘執行專用清理（啟動即執行），不依賴每日備份清理。工作正在處理時，待處理完成或租約失效才清除；Worker 停止時無法準時清理，重啟後補執行。
- 未完成且沒有文章關聯的到期工作標記 `EXPIRED`，清除原始 HTML、區塊、圖片二進位、來源圖片 URL 與改寫／編輯暫存；保留輕量工作紀錄。
- `READY` 工作只清除原始抓取內容及圖片二進位，保留編輯草稿、R2 objectKey/publicUrl 及文章。此清理不刪除 R2 物件。
- 回歸涵蓋 30 分鐘邊界、舊 24 小時期限、排隊工作、有效租約、READY 草稿及 R2 引用保留、重複清理不再寫入。

參考私人專案 `applet0421/wechatpublicaccount` 的 `backend/app/adapters/extractor.py`，比較相同來源的請求差異：原有無 User-Agent 請求收到驗證導向；舊專案標頭取得 HTML，但超過 2 MiB 上限。8 MiB 診斷取得約 3.22 MB HTML。

本次修正：

- 文章請求帶入舊專案相同 User-Agent，HTML 上限為 8 MiB。
- 圖片傳輸明確套用圖片主機白名單及 10 MiB 單張上限。
- 正文處理遞迴拆出容器內的圖片，保留文字與圖片順序。
- 維持來源驗證頁的辨識，不將驗證頁當正文。

實際擷取結果：文章「使用Claudeflare 实现域名邮箱自由」，40 個區塊、14 張內文圖片要求、14 張下載成功、0 個圖片失敗。此檢查未呼叫 LLM 或上傳 R2。

自動回歸：`npx vitest run src/lib/wechat-import/http-extractor.test.ts src/lib/wechat-import/normalize-content.test.ts src/lib/wechat-import/asset-fetcher.test.ts`，3 檔 5 項通過；`npx tsc --noEmit` 通過。

範圍：本次驗證傳統 `#js_content` 文章。舊版的 `content_noencode` 新版頁面解析、獨立封面與後續改寫/R2/發佈仍需另外驗證，不能由此次成功推定已完成。

## 改寫錯誤回歸（2026-09-08）

- LLM 紀錄確認原始錯誤為 `expected object, received string`：provider 回傳 JSON 字串，改寫流程漏掉 JSON 解碼。已使用共用結構化解析器後再做 Zod 驗證。
- 首次修正後的實際重試仍因輸出欄位格式不符失敗；補齊文字／圖片 block schema、SEO 字串及長度規格，將完整規格傳入 JSON-only provider 的 Prompt。
- 第二次實際重試成功產生 40 個區塊、14 個圖片區塊。另發現一個模型改錯的 assetId，改由伺服器依原始 block id 綁定圖片；已無模型呼叫地修復這筆既有草稿，並驗證完整圖片集合及忠實模式的 id/type 順序。
- Worker 現在區分模型驗證、限流、逾時、輸出格式等錯誤，不再全部顯示「檢查模型設定」。未加入自動付費重試。
- 回歸命令：`npx vitest run src/lib/wechat-import/rewrite.test.ts src/lib/wechat-import/worker.test.ts src/lib/wechat-import/schema.test.ts`，12 項通過。測試使用獨立 `onewiki_test` 資料庫。
- 未完成項目：實際模型草稿仍含簡體用字，需繁體校正及內容人工審核；本次未確認 R2 轉存、編輯器或發佈流程，亦未實測其他模型供應商。
