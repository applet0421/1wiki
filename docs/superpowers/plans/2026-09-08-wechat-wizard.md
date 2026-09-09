# WeChat Wizard Implementation Plan

最後更新：2026-09-09

文件狀態：歷史實作計畫；現行操作與回歸以 [微信擷取相容性回歸](../../wechat-fetch-regression.md) 為準。

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task, inline on main as requested.

**Goal:** Turn WeChat imports into the user-approved five-step workflow with complete previews and explicit actions.

**Architecture:** Keep existing worker states and editor. A client workspace manages viewing steps without mutations; authenticated server actions persist rewrite settings and confirmed draft edits. A private image route serves staged bytes without embedding them in page payloads.

**Tech Stack:** Next.js App Router, React, Prisma, Vitest, CSS modules.

**Spec:** User-approved design in this conversation: input → original preview → rewrite settings → review → transfer/editor.

**最後更新：** 2026-09-08

**Execution status:** Tasks 1–3 implemented and verified inline on main. Final full suite: 140 files / 435 tests passed; TypeScript, scoped ESLint and diff checks passed. Browser checked original/rewrite previews, navigation, narrow layout and expiry/re-import. External LLM/R2/publishing actions were not executed for UI QA; those boundaries use isolated tests. See `docs/wechat-fetch-regression.md` for limitations.

## Global Constraints

- Traditional Chinese UI; preserve blue/white shell and unrelated worktree changes.
- No automatic LLM retries or publishing; retain old draft until replacement succeeds.
- Database staging expires 30 minutes after creation; enforce server-side and show countdown.
- Private provenance only; no public source footer. No image bytes in serialized workspace props.

### Task 1: Safe workflow boundaries and preview data

Files: `src/app/(backoffice)/admin/posts/wechat-actions.ts`, its test, `src/lib/wechat-import/repository.ts`, `worker.ts`, new `src/app/api/admin/wechat-assets/[id]/route.ts` and test.

- [ ] Add failing action tests for settings/rewrite from REWRITTEN with previous draft retained, expired legacy jobs rejected, edited draft and owned cover selection persisted atomically. Example: `expect(await queueWeChatRewriteAction(id,"FAITHFUL",{targetLocale:"ja",instructions:"簡潔"})).toEqual({ok:true})`.
- [ ] Run isolated DB Vitest; confirm failures for missing boundaries.
- [ ] Persist options in existing report JSON, use compare-and-set status and expiry predicates. Transfer validates edited metadata using `parseRewriteDraft`, preserving blocks. Image endpoint checks owner and expiration before returning `Cache-Control: private, no-store`.
- [ ] Test unauthenticated/other-owner/expired image access and metadata-only page payloads.

### Task 2: Five-step workspace

Files: `src/components/admin/wechat-import-workspace.tsx`, new `wechat-wizard.module.css`, `wechat-article-preview.tsx`, `wechat-import-workspace.test.tsx`, starter, detail page.

- [ ] Add failing component tests: REWRITTEN shows full text/image and five steps; switching original/settings does not call actions; expiration disables submission; abandon requires confirmation.
- [ ] Build step navigation, complete preview/side-by-side comparison, settings, editable title/excerpt/SEO, cover selector, review checklist, persistent action bar and safe async error feedback.
- [ ] Poll status and heartbeat while work is pending; countdown uses effective expiry with warning thresholds. Expose worker failure details and explicit retry. READY keeps editor entry and image completion summary.
- [ ] Run component tests and TypeScript/ESLint. Use responsive grid and wrapping controls; keep timers out of live announcement regions.

### Task 3: Integration and verification

Files: `docs/wechat-fetch-regression.md` plus above test files.

- [ ] Run `npx vitest run src/lib/wechat-import src/lib/retention/cleanup-wechat.test.ts 'src/app/(backoffice)/admin/posts/wechat-actions.test.ts' src/components/admin/wechat-import-workspace.test.tsx 'src/app/api/admin/wechat-assets/[id]/route.test.ts'` using test DB only.
- [ ] Run `npx tsc --noEmit`, scoped ESLint and `git diff --check`.
- [ ] Inspect actual browser UI read-only; do not purchase model calls, transfer images or publish solely for visual checks. Report unavailable states explicitly.
- [ ] Update regression record with exact tests and limitations; commit only task files on main.
