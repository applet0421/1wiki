# 微信擷取相容性回歸

最後更新：2026-09-08

參考私人專案 `applet0421/wechatpublicaccount` 的 `backend/app/adapters/extractor.py`，比較相同來源的請求差異：原有無 User-Agent 請求收到驗證導向；舊專案標頭取得 HTML，但超過 2 MiB 上限。8 MiB 診斷取得約 3.22 MB HTML。

本次修正：

- 文章請求帶入舊專案相同 User-Agent，HTML 上限為 8 MiB。
- 圖片傳輸明確套用圖片主機白名單及 10 MiB 單張上限。
- 正文處理遞迴拆出容器內的圖片，保留文字與圖片順序。
- 維持來源驗證頁的辨識，不將驗證頁當正文。

實際擷取結果：文章「使用Claudeflare 实现域名邮箱自由」，40 個區塊、14 張內文圖片要求、14 張下載成功、0 個圖片失敗。此檢查未呼叫 LLM 或上傳 R2。

自動回歸：`npx vitest run src/lib/wechat-import/http-extractor.test.ts src/lib/wechat-import/normalize-content.test.ts src/lib/wechat-import/asset-fetcher.test.ts`，3 檔 5 項通過；`npx tsc --noEmit` 通過。

範圍：本次驗證傳統 `#js_content` 文章。舊版的 `content_noencode` 新版頁面解析、獨立封面與後續改寫/R2/發佈仍需另外驗證，不能由此次成功推定已完成。
