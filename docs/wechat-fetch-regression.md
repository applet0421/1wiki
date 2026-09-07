# 微信擷取相容性回歸

最後更新：2026-09-08

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
