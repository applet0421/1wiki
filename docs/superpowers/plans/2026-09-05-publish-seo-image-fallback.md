# Publish SEO and Image Fallback Implementation Plan

最後更新：2026-09-06

## 2026-09-06 執行狀態

SEO 圖片 resolver、發布時空白 SEO 欄位及 alt 補值、metadata／JSON-LD 共用 resolver 已有程式實作。工作區另增加「發布時將正文第一張圖片存為封面」，其規則與 SEO resolver 不完全相同，見 [文章編輯與媒體](../../article-editing.md)。

本次 resolver 的 4 項測試通過；完整發布 action、資料庫回歸與 build 未重跑。原 checklist 保留原驗收要求，不能用本次局部測試宣告全部完成；詳見 [測試紀錄](../../test-log.md)。


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete missing publication SEO fields and resolve the canonical social/article image as cover image, first valid body image, or default image.

**Architecture:** Add pure SEO helpers for first-image extraction and fallback resolution. Run completion in the server publish action before `savePost`, preserving supplied values and using deterministic fallbacks; runtime metadata and Article JSON-LD use the same resolver.

**Tech Stack:** Next.js server actions, TypeScript, Vitest, sanitize-html-compatible HTML parsing.

**Spec:** User-approved chat design: preserve manual values; image priority is cover → first valid body image → default.

**Global Constraints**

- Do not overwrite non-empty manual SEO or image alt content.
- Keep publication functional when AI is unavailable by using deterministic title/excerpt/keyword fallbacks.
- Use absolute image URLs in metadata and structured data.

### Task 1: SEO image resolver

**Files:** Create `src/lib/seo/image.ts`, Test `src/lib/seo/image.test.ts`

- [ ] Add tests for cover priority, first valid `<img>` fallback, invalid/data URL filtering, and default fallback.
- [ ] Implement pure `resolveArticleImage({ coverImage, contentHtml, siteUrl })` returning an absolute URL and `extractFirstBodyImage`.

### Task 2: Publish-time SEO completion

**Files:** Modify `src/app/(backoffice)/admin/posts/actions.ts`, Test `src/app/(backoffice)/admin/posts/actions.test.ts`

- [ ] Add tests that publishing fills blank `seoTitle`, `seoDescription`, and `seoKeywords` while preserving supplied values.
- [ ] Before `savePost`, derive deterministic fallbacks from title, excerpt, and primary title keyword; pass completed values to the existing repository.

### Task 3: Shared metadata and Article JSON-LD fallback

**Files:** Modify `src/lib/seo/metadata.ts`, `src/lib/seo/structured-data.ts`, tests in existing SEO test files

- [ ] Add tests proving both Open Graph and Article JSON-LD use the same cover/body/default priority.
- [ ] Call the shared resolver and keep generated URLs absolute.

### Task 4: Verification

- [ ] Run focused SEO and action tests.
- [ ] Run `npm test` and `npm run lint`.
- [ ] Review the diff for unrelated changes.
