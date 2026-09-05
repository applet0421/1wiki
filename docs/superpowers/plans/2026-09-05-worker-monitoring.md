# Worker Monitoring Implementation Plan

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
