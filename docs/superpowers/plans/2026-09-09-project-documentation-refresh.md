# 1Wiki Project Documentation Refresh Implementation Plan

最後更新：2026-09-09

文件狀態：已執行；文件整理完成，驗證已記錄。全量程式測試、Lint 與 Build 的既有阻擋不在本次文件範圍內，詳見 `docs/test-log.md`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 1Wiki 的專案入口、目前工作狀態、操作手冊、驗證紀錄及歷史設計文件整理成截至 2026-09-09 可追溯、互相一致的文件集。

**Architecture:** `README.md` 保留為安裝、架構與部署入口；新增 `docs/README.md` 作為文件目錄與真相來源導覽；`docs/project-status.md` 記錄已完成、進行中、外部待辦與發布門檻；`docs/test-log.md` 只記錄實際執行的驗證。歷史 specs/plans 保留當時決策，只新增文件狀態與檢閱日期，不回寫成虛假的完成紀錄。

**Tech Stack:** Markdown、Git、Next.js 16.3.4、React 19.2.8、Prisma 7.10.0、Vitest 5、Playwright 1.62.1。

**Spec:** 使用者於 2026-09-09 提出的「更新現在專案與工作相關的所有文檔，系統性整理到最新版本」。

## Global Constraints

- 所有異動文件必須包含 `最後更新：2026-09-09`。
- 現有未提交程式碼屬於使用者；只修改文件，不覆寫或回復程式碼與資產。
- 未提交首頁、導覽列及首頁 AdSense 變更標記為「進行中／待驗證」，不得描述為已發布。
- 外部服務、正式部署、遠端資料庫與搜尋引擎狀態只記錄可證明的結果，不因本機實作而推定已啟用。
- 此 repository 不包含 Meta Creator Marketplace Phase 1；不得建立不存在的 PRD、測試紀錄或 API 能力聲明。

---

### Task 1: 建立文件清冊與真相來源

**Files:**
- Create: `docs/README.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: repository 中所有 Markdown 文件、`package.json`、migration 清單與 Git 狀態。
- Produces: 文件分層、維護規則、最新入口與歷史文件清冊。

- [x] 列出操作文件、現況／驗證文件、稽核文件與歷史 specs/plans。
- [x] 在 `docs/README.md` 定義各類文件用途、狀態與更新原則。
- [x] 更新 `README.md` 的日期、功能摘要、首頁／導覽／廣告現況及文件入口。
- [x] 以本地 Markdown link checker 驗證所有連結目標存在。

### Task 2: 重建目前工作狀態

**Files:**
- Modify: `docs/project-status.md`

**Interfaces:**
- Consumes: `git log`、`git status`、`git diff`、Prisma migration、routes、workers 與現有操作文件。
- Produces: 已完成／進行中／外部待辦／發布門檻四類狀態及本次工作樹基準。

- [x] 更新基準 commit、未提交變更範圍與資料庫 migration 數量。
- [x] 將首頁文章流、響應式導覽及首頁廣告標為進行中。
- [x] 校正微信、AdSense、品牌 SEO、快取、備份、GA4 與搜尋通知的實作及外部狀態。
- [x] 明確列出下一步與不可由本次盤點推定的事項。

### Task 3: 校正所有現行操作文件

**Files:**
- Modify: `docs/ai-article-images.md`
- Modify: `docs/article-auto-loading.md`
- Modify: `docs/article-editing.md`
- Modify: `docs/author-library.md`
- Modify: `docs/cache-monitoring.md`
- Modify: `docs/search-engine-submission.md`
- Modify: `docs/traffic-monitoring.md`
- Modify: `docs/wechat-fetch-regression.md`
- Modify: `docs/audits/2026-09-08-category-layout-ad-placement-audit.md`

**Interfaces:**
- Consumes: 對應程式模組、環境變數、API routes、Compose 與測試。
- Produces: 日期一致、狀態界線清楚且連回最新工作狀態／測試紀錄的操作說明。

- [x] 將每份文件的 `最後更新` 設為 2026-09-09。
- [x] 補上「文件狀態」並區分已實作、待外部驗證與歷史稽核。
- [x] 校正首頁／分類／文章廣告版位與 1280px 桌面門檻。
- [x] 保留真實執行結果，不改寫未重跑的歷史測試數字。

### Task 4: 標示歷史 specs 與 plans

**Files:**
- Modify: `docs/superpowers/specs/*.md`
- Modify: `docs/superpowers/plans/*.md`

**Interfaces:**
- Consumes: 文件索引與目前工作狀態。
- Produces: 每份歷史文件都有 2026-09-09 檢閱日期與「歷史設計／歷史計畫／進行中計畫」定位。

- [x] 不改動既有需求與 task 內容，只在標題後加入或更新日期及狀態。
- [x] 首頁文章流計畫標為進行中；本文件標為已執行。
- [x] 其他已落地計畫標為歷史實作計畫，並以 `docs/project-status.md` 為現況準據。

### Task 5: 驗證與記錄

**Files:**
- Modify: `docs/test-log.md`
- Modify: `docs/superpowers/plans/2026-09-09-project-documentation-refresh.md`

**Interfaces:**
- Consumes: Markdown 連結檢查、版本字串檢查、`git diff --check` 與適用的程式驗證。
- Produces: 可重跑的文件驗證命令與結果。

- [x] 執行 Markdown 本地連結檢查與「最後更新」完整性檢查。
- [x] 執行首頁、導覽、廣告與文件所涉 focused tests。
- [x] 執行 TypeScript、ESLint 與 `git diff --check`；既有失敗已明確標記來源。
- [x] 將實際命令、通過數及限制寫入 `docs/test-log.md`。
- [x] 將本計畫狀態改為已執行，並檢查沒有 placeholder 或虛假完成聲明。

## Plan Self-Review

- 規格覆蓋：涵蓋入口、現況、操作、驗證、稽核及歷史文件六類文件。
- Placeholder 掃描：本計畫沒有待填標記或未定義的實作步驟。
- 一致性：`docs/README.md` 是導覽，`docs/project-status.md` 是現況，`docs/test-log.md` 是實際驗證，歷史文件不作現況依據。
