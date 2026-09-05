# 文章編輯、封面與影片

最後更新：2026-09-06

## 封面與文章卡片

首頁與分類列表的共用文章卡片在 `coverImage` 有值時顯示可點擊的延後載入圖片，沒有封面時維持文字卡片。卡片封面與 YouTube Shorts 支援已提交於 `5339e2e`。

`d5f0074` 的文章編輯器新增「上傳到 R2」：選取 JPEG、PNG、WebP 或 GIF，透過既有 `/api/admin/uploads/images` 取得簽名，再由瀏覽器 PUT 至 R2，成功後填入封面網址。沿用 10MB 上限與 README 的 R2／CORS 設定。上傳完成仍需儲存文章；本次未實測 R2。

`d5f0074` 的 `savePostInTransaction` 在發布且未填封面時，讀取清理後正文的**第一個** `<img>`；僅當其 src 是絕對 HTTP／HTTPS 網址時存為封面。草稿不補值，既有非空封面保留。若第一張無效，不會繼續尋找後面的圖片。此功能不會批次回填歷史文章。

## 發布與 SEO 圖片

發布時，空白 SEO 標題、描述、關鍵字由標題／摘要／正文補齊，圖片缺少 alt 時補入文字；人工非空內容保留。

Open Graph 與 Article JSON-LD 共用 `resolveArticleImage`，優先順序為有效封面 → 正文第一張有效圖片 → `/og-default.svg`，支援將相對網址解析成絕對網址。這是呈現時的 SEO 圖片解析；與上述存入 `coverImage` 的首圖判斷不同。

## YouTube

正文編輯器接受 `youtube.com/watch?v=…`、`youtu.be/…` 與 `youtube.com/shorts/…`，轉成 `youtube-nocookie.com/embed/…` iframe。影片標題會跳脫 HTML，iframe 使用延後載入。未支援的網域或不合法 ID 不插入。

## 驗證狀態

本次文章卡片、YouTube、SEO 圖片 resolver 聚焦測試通過，詳見 [測試紀錄](test-log.md)。封面上傳 UI／真實 R2、發布補封面的資料庫測試與發布 action 完整流程本次未重跑，不視為已驗收。
