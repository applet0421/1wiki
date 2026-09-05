# AI 配圖實作計畫

最後更新：2026-09-05

目標：從目前未儲存的標題與正文規劃一張圖片，Nano Banana 2 生成、R2 上傳、alt 校對、預覽後安全插入段落。使用者已核定此流程；直接執行。

架構：Next.js 管理端 API 建立 PostgreSQL 任務；獨立 Node worker 原子領取任務，保存生成結果再上傳。前端輪詢狀態，插入只改編輯器。任務不自動發布文章。既有未提交更動保留。

環境：GEMINI_IMAGE_MODEL=gemini-3.1-flash-image、GEMINI_IMAGE_SIZE=512、GEMINI_IMAGE_ASPECT_RATIO=9:16；生圖與文字模型分開。尺寸使用模型原生輸出，不縮放。

- [x] 模型設定、Gemini 圖片與視覺 alt provider：測試參數驗證、inlineData、thought 排除、拒絕／逾時、usage 分類。
- [x] PostgreSQL 任務、Prompt migration、持久化 worker、R2 server upload：測試原子領取、重複生成、上傳重試、逾時不自動重生、權限與設定錯誤。
- [x] 編輯器 AI 配圖面板：最新表單值、可修改方案、預覽插入、段落變更防護、重新整理恢復、狀態與錯誤。
- [x] 更新 .env.example、LLM 圖片計價、操作文件。新功能測試、既有測試、型別／Lint、隔離資料庫 migration 及瀏覽器驗證。

介面：POST /api/admin/ai-images/plan 接受 title、locale、postId（可選）、paragraphs（id/text/tag）；回傳 ImageJobView。POST /api/admin/ai-images/[id] 接受 action=generate 與 prompt/alt/targetId 或 action=retry-upload；GET 回傳同一 View。View 欄位 id/status/prompt/alt/reason/targetId/paragraphs/publicUrl/width/height/error/model/imageSize/aspectRatio/altWarning。狀態 PLANNED、QUEUED、GENERATING、GENERATED、UPLOADING、READY、FAILED、UNKNOWN。

驗證：完整269項測試、型別、Lint、隔離正式建置與 migration 通過。瀏覽器視覺檢查因 Mac 鎖定未完成；真實生圖待 Gemini 金鑰，遠端 migration 尚未執行。
