# Worker Monitoring Implementation Plan

最後更新：2026-09-06

## 2026-09-06 執行狀態

已實作 `WorkerHeartbeat`、OWNER `/admin/worker`、失敗圖片重試上傳及 `scripts/image-worker.ts` 心跳。Worker 啟停已改為資料庫 `desiredState`，不再使用 shell 指令或 Docker socket；另新增 OWNER `/admin/cache` 監控公開 ISR／Cloudflare purge Outbox。實際介面為 Server Component 與手動表單重新整理，並沒有計畫中的 `worker-monitor.tsx`／對應元件測試；心跳也寫在 script 而非此計畫列出的 library。

已存在的實作不等於下方 checklist 全部驗收；目前已完成本機 90 個測試檔／310 項測試、型別、Lint 與 production build。正式 VM、Cloudflare purge 與真實 AI/R2 整合仍待外部環境驗收。操作與心跳判讀見 [AI 配圖](../../ai-article-images.md)，快取失效見 [快取監控](../../cache-monitoring.md)，本次驗證見 [測試紀錄](../../test-log.md)。


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an owner-only Worker monitoring page that reports image worker health and queued image-generation jobs, with safe refresh and retry actions.

**Architecture:** A server route reads worker heartbeat and `ImageGeneration` aggregates from Prisma. A small client component refreshes the snapshot and posts retry requests for failed uploadable jobs. The existing admin navigation links to `/admin/worker`.

**Tech Stack:** Next.js App Router, React, Prisma, Vitest, existing admin session helpers.

**Spec:** `docs/ai-article-images.md`

## Global Constraints

- Worker status must be based on persisted heartbeat data and queued image jobs.
- Only authenticated OWNER users may view or mutate worker monitoring data.
- Retry actions must call the existing image-job API and never generate a second image implicitly.

### Task 1: Persist and expose worker heartbeat

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260905110000_worker_heartbeat/migration.sql`
- Create: `src/app/(backoffice)/admin/worker/actions.ts`
- Create: `src/app/(backoffice)/admin/worker/actions.test.ts`

- [ ] Add a singleton `WorkerHeartbeat` model with worker name, last heartbeat, started time, processed count, and last error.
- [ ] Add an owner-authenticated server action that returns heartbeat plus grouped image job counts and recent jobs.
- [ ] Add tests for owner access and status aggregation.

### Task 2: Build the monitoring page

**Files:**
- Create: `src/app/(backoffice)/admin/worker/page.tsx`
- Create: `src/components/admin/worker-monitor.tsx`
- Create: `src/components/admin/worker-monitor.test.tsx`
- Modify: `src/app/globals.css`

- [ ] Render online/stale/offline status, last heartbeat, queue counts, recent jobs, refresh, and retry-upload actions.
- [ ] Make retry explicit and limited to failed jobs that contain generated image bytes.
- [ ] Test status rendering, refresh, and retry request behavior.

### Task 3: Register the navigation entry and worker heartbeat

**Files:**
- Modify: `src/components/admin/admin-nav.tsx`
- Modify: `src/components/admin/admin-nav.test.tsx`
- Modify: `src/lib/ai/image-worker.ts`

- [ ] Add an OWNER-only `Worker 監控` link.
- [ ] Update heartbeat before and after each worker polling cycle and record failures.
- [ ] Run focused tests, typecheck, and lint.
