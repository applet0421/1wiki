# 1Wiki 文件中心

最後更新：2026-09-09

文件狀態：現行索引。本頁是專案文件的導覽入口；功能現況以 [目前工作狀態](project-status.md) 為準，實際跑過的命令與結果以 [本機驗證紀錄](test-log.md) 為準。

## 閱讀順序

1. [專案 README](../README.md)：產品範圍、本機啟動、環境設定、測試與部署。
2. [目前工作狀態](project-status.md)：已完成、進行中、外部待辦與發布門檻。
3. [本機驗證紀錄](test-log.md)：每次實際執行的測試、型別、Lint、Build 與限制。
4. 下方主題操作文件：依功能查設定、行為、故障定位與驗證方式。

## 現行操作文件

| 文件 | 用途 | 目前定位 |
| --- | --- | --- |
| [AI 配圖](ai-article-images.md) | Gemini 圖片設定、R2、任務狀態及 Worker | 已實作；真實供應商與正式 R2 需逐環境驗證 |
| [同分類文章連續閱讀](article-auto-loading.md) | 文章續載、分類載入及文章／分類廣告 | 已實作；包含 1280px 桌面側欄規則 |
| [文章編輯、封面與影片](article-editing.md) | 封面、SEO 圖片、Rich Text 與 YouTube | 已實作；外部 R2 整合依環境驗證 |
| [作者庫](author-library.md) | 作者管理、署名與公開作者頁 | 已實作 |
| [公開快取與 Cloudflare 監控](cache-monitoring.md) | ISR、失效 Outbox、purge 與部署模式 | 本機已實作；正式 Cloudflare／VM 未由本次確認 |
| [搜尋引擎通知與設定](search-engine-submission.md) | sitemap、品牌 SEO、IndexNow 與上線缺口 | 部分實作；不可視為已啟用 |
| [流量監測與 GA4](traffic-monitoring.md) | 前台 page view、OWNER 報表與同步 | 已實作；外部 GA4 權限／同步未由本次確認 |
| [微信擷取相容性回歸](wechat-fetch-regression.md) | 五步驟匯入、30 分鐘暫存、改寫與繁中正規化 | 已實作並有歷史回歸；R2／發布及多來源仍有外部限制 |

## 現況、稽核與機器可讀紀錄

| 文件 | 狀態 |
| --- | --- |
| [目前工作狀態](project-status.md) | 現行真相來源 |
| [本機驗證紀錄](test-log.md) | 只追加實際執行結果，不以推測補值 |
| [搜尋引擎 smoke summary](search-engine-smoke.summary.json) | 歷史 local-unit-and-lint；非 E2E 或外部提交證明 |
| [分類頁版面與廣告位稽核](audits/2026-09-08-category-layout-ad-placement-audit.md) | 歷史稽核；主要 P1 已實作，最新狀態見工作狀態 |

## 歷史設計規格

下列文件保存需求與架構決策，不會隨每次實作細節重寫；若與現行程式不同，以工作狀態及操作文件為準。

- [MVP 設計](superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md)
- [多語系內容架構](superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md)
- [Prompt 與 LLM 用量管理](superpowers/specs/2026-09-04-prompt-and-llm-usage-management-design.md)
- [三級分類](superpowers/specs/2026-09-05-hierarchical-categories-design.md)
- [資料保留與清理](superpowers/specs/2026-09-06-data-retention-cleanup-design.md)
- [品牌與搜尋呈現](superpowers/specs/2026-09-07-brand-seo-settings-design.md)
- [微信公眾號文章改寫](superpowers/specs/2026-09-07-wechat-public-account-rewrite-design.md)
- [AdSense 覆蓋式廣告](superpowers/specs/2026-09-08-adsense-overlay-format-design.md)
- [首頁極簡文章流](superpowers/specs/2026-09-08-homepage-editorial-feed-design.md)

## 歷史與進行中實作計畫

`docs/superpowers/plans/` 保存實作切分及當時驗收條件。除下列兩份外，其餘計畫均視為歷史執行紀錄，不應用未勾選 checkbox 判定現況：

- [首頁極簡文章流](superpowers/plans/2026-09-08-homepage-editorial-feed.md)：目前工作樹進行中，尚待完整驗證。
- [本次文件整理](superpowers/plans/2026-09-09-project-documentation-refresh.md)：本次更新的範圍與驗證清單。

## 維護規則

- 每次文件異動必須更新 `最後更新：YYYY-MM-DD`。
- 新功能先更新對應 spec／plan；實作完成後同步更新操作文件、[工作狀態](project-status.md) 與 [測試紀錄](test-log.md)。
- 「已實作」只代表 repository 具備程式；「已驗證」必須附命令與結果；「已部署／已啟用」必須有外部環境證據。
- 歷史測試數字不得因後續檔案增加而回填；新一輪驗證另開日期區段。
- 此 repository 目前不含 Meta Creator Marketplace Phase 1 文件或功能；其專案規範不適用於本次 1Wiki 文件整理。
