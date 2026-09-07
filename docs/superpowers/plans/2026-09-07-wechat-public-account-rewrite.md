# 微信公眾號文章改寫 Implementation Plan

最後更新：2026-09-07

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增可從公開免登入微信文章擷取完整圖文、預覽、以 LLM 轉譯及 SEO 改寫、確認後轉存 R2，並交給既有文章編輯器人工發布的持久化工作流。

**Architecture:** Next.js 後台只建立工作、查詢狀態與顯示預覽；獨立 `wechat-import-worker` 透過 PostgreSQL 原子 claim 執行 HTTP 擷取、受限 Chromium fallback、LLM 改寫與 R2 上傳。正文先轉成帶穩定 block ID 的 canonical blocks，圖片 bytes 在確認前暫存 PostgreSQL，成功轉存後才把 R2 URL 組成 immutable editor draft。

**Tech Stack:** Next.js 16.3.4 App Router、React 19.2.8、TypeScript 6、Prisma 7／PostgreSQL 17、Zod 4、Cheerio、Sharp、playwright-core 1.62.1、Cloudflare R2 S3 API、Vitest、Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-09-07-wechat-public-account-rewrite-design.md`

## Global Constraints

- 只處理公開、免登入的 `https://mp.weixin.qq.com/s/...` 單篇文章；不繞過登入、驗證碼、付費或其他存取限制。
- HTTP 擷取優先；只有完整性檢查不通過時才使用無持久 Cookie 的 headless Chromium fallback。
- 原文預覽與改寫預覽不得上傳 R2；只有使用者確認改寫後才轉存圖片。
- Phase 1 保留原始圖片，不做圖片內文字 OCR、翻譯、去字或重排。
- 後台保存來源 provenance；公開文章頁不顯示來源註記，也不把來源 URL 設為 canonical。
- 未完成、失敗或放棄工作的 HTML 與圖片 bytes 於 24 小時後清除。
- 每個外部流程固定產出含 `generated_at` 的 `summary`、`success`、`failure`。
- 所有會觸發 LLM 費用的中斷若結果不明，標記 `UNKNOWN`，不得自動重送。
- Chromium 只安裝於微信 Worker container，不加入一般 Web runtime。
- 每次文件更新都更新「最後更新：YYYY-MM-DD」；正式 smoke 同步更新 `docs/wechat-import-smoke.summary.json` 與命令／用例紀錄。
- 實作前先閱讀 repository 內 Next.js 16 文件：`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`、`15-route-handlers.md`、`02-guides/server-actions.md`、`02-guides/data-security.md`、`03-api-reference/03-file-conventions/route.md`。
- 保留使用者現有未提交變更；目前 `next-env.d.ts` 為既有修改，不納入本功能 commit。

---

## File map

### Domain and persistence

- `prisma/schema.prisma`、`prisma/migrations/20260907120000_add_wechat_imports/migration.sql`：匯入、資產、Post provenance 與 retention schema。
- `src/lib/wechat-import/types.ts`：跨模組 domain types、狀態、錯誤碼與 view contract。
- `src/lib/wechat-import/schema.ts`：Zod action、LLM result、stored JSON parsers。
- `src/lib/wechat-import/report.ts`：穩定 report 建立與合併。
- `src/lib/wechat-import/state-machine.ts`：唯一合法狀態轉移表。
- `src/lib/wechat-import/repository.ts`：Prisma 建立、ownership、claim、lease 與 view queries。

### Extraction

- `src/lib/wechat-import/url-policy.ts`：URL allowlist、DNS／IP 判定、固定解析 HTTPS request。
- `src/lib/wechat-import/parse-wechat-html.ts`：微信 DOM、metadata、script fallback parser。
- `src/lib/wechat-import/normalize-content.ts`：sanitize、canonical blocks、完整性檢查。
- `src/lib/wechat-import/asset-fetcher.ts`：圖片 allowlist、下載上限、magic bytes、Sharp decode。
- `src/lib/wechat-import/http-extractor.ts`：HTTP extraction orchestration。
- `src/lib/wechat-import/browser-extractor.ts`：Chromium fallback 與 request restriction。
- `src/lib/wechat-import/fixtures/*.html`：去識別微信頁面 fixtures。

### Rewrite, transfer, and worker

- `src/lib/wechat-import/rewrite.ts`：block chunking、Prompt variables、結構化輸出與 image invariants。
- `src/lib/wechat-import/r2-transfer.ts`：asset claim、固定 object key、上傳與 editor draft 組裝。
- `src/lib/wechat-import/worker.ts`：依狀態執行下一工作與 lease recovery。
- `scripts/wechat-import-worker.ts`：程序生命週期、heartbeat、desired state。
- `src/lib/wechat-import/cleanup.ts`：24 小時 payload 清理。

### App and UI

- `src/app/(backoffice)/admin/posts/wechat/page.tsx`：載入分類、作者、provider 與工作台。
- `src/app/(backoffice)/admin/posts/wechat/actions.ts`：create、rewrite、transfer、retry、abandon actions。
- `src/app/api/admin/wechat-imports/[id]/route.ts`：polling view。
- `src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.ts`：登入後圖片預覽。
- `src/components/admin/wechat-import-workbench.tsx`：四階段 client state 與 polling。
- `src/components/admin/wechat-source-preview.tsx`：原文與圖片完整性畫面。
- `src/components/admin/wechat-rewrite-review.tsx`：原文／改寫比較、模式與確認。
- `src/components/admin/post-editor.tsx`：接受 `WeChatEditorDraft` 與 `sourceImportId`。
- `src/app/(backoffice)/admin/worker/page.tsx`、`src/app/(backoffice)/admin/worker/actions.ts`、`src/lib/workers/registry.ts`：共用 Worker 管理與微信 metrics。

### Operations and docs

- `Dockerfile`、`docker-compose.vm.yml`、`docker-compose.coolify.yml`、`package.json`：獨立 Chromium Worker image 與 service。
- `src/lib/retention/{settings,cleanup}.ts`：24 小時到期清理。
- `README.md`、`docs/wechat-public-account-rewrite.md`、`docs/test-log.md`、`docs/project-status.md`、`docs/wechat-import-smoke.summary.json`：設定、營運、回歸與狀態。

---

### Task 1: 建立 Prisma 匯入、資產與 provenance schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260907120000_add_wechat_imports/migration.sql`
- Modify: `tests/helpers/database.ts`
- Create: `tests/integration/wechat-import-schema.test.ts`

**Interfaces:**
- Produces: Prisma enums `WeChatImportStatus`、`WeChatRewriteMode`、`WeChatAssetStatus`。
- Produces: `prisma.weChatImport`、`prisma.weChatImportAsset` delegates。
- Produces: optional unique `Post.sourceImportId` relation and `DataRetentionSetting.weChatImportHours` default 24。

- [ ] **Step 1: 寫 schema integration failing test**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resetDatabase } from "../helpers/database";

describe("WeChat import schema", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("stores a staged article, ordered assets, and one optional Post provenance link", async () => {
    const user = await prisma.user.create({ data: { username: "wechat-schema", displayName: "Schema", passwordHash: "test", mustChangePassword: false } });
    const imported = await prisma.weChatImport.create({ data: {
      userId: user.id,
      sourceUrl: "https://mp.weixin.qq.com/s/example",
      normalizedUrl: "https://mp.weixin.qq.com/s/example",
      targetLocale: "zh-tw",
      expiresAt: new Date("2026-09-08T00:00:00.000Z"),
      assets: { create: [{ position: -1, isCover: true, originalUrl: "https://mmbiz.qpic.cn/cover", mimeType: "image/jpeg", byteSize: 3, sha256: "a".repeat(64), alt: "封面", imageBytes: new Uint8Array([1, 2, 3]) }] },
    }, include: { assets: true } });
    expect(imported.status).toBe("FETCH_QUEUED");
    expect(imported.rewriteMode).toBe("FAITHFUL");
    expect(imported.assets[0]).toMatchObject({ position: -1, status: "STAGED" });
    const settings = await prisma.dataRetentionSetting.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
    expect(settings.weChatImportHours).toBe(24);
  });
});
```

- [ ] **Step 2: 執行測試並確認因 delegates／欄位不存在而失敗**

Run: `npm test -- tests/integration/wechat-import-schema.test.ts`

Expected: FAIL，TypeScript／runtime 顯示 `weChatImport` 或新欄位不存在。

- [ ] **Step 3: 新增 enums、models、relations 與 SQL migration**

Prisma models 必須逐字使用 spec 第 6 節欄位；migration 明確建立三個 enums、`WeChatImport`、`WeChatImportAsset`、索引、foreign keys，並執行：

```sql
ALTER TABLE "Post" ADD COLUMN "sourceImportId" TEXT;
ALTER TABLE "DataRetentionSetting" ADD COLUMN "weChatImportHours" INTEGER NOT NULL DEFAULT 24;
CREATE UNIQUE INDEX "Post_sourceImportId_key" ON "Post"("sourceImportId");
ALTER TABLE "Post" ADD CONSTRAINT "Post_sourceImportId_fkey"
  FOREIGN KEY ("sourceImportId") REFERENCES "WeChatImport"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

在 `resetDatabase()` 的最前面依 relation 次序刪除 `weChatImportAsset`、`weChatImport`，避免後續整合測試互相污染。

- [ ] **Step 4: 產生 Prisma client、部署 migration 並重跑測試**

Run: `npm run prisma:generate && npm run db:migrate && npm test -- tests/integration/wechat-import-schema.test.ts`

Expected: PASS，1 test；migration 可對空測試資料庫完整部署。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260907120000_add_wechat_imports/migration.sql tests/helpers/database.ts tests/integration/wechat-import-schema.test.ts
git commit -m "feat: add WeChat import persistence"
```

### Task 2: 定義 domain contracts、Zod schemas、report 與狀態機

**Files:**
- Create: `src/lib/wechat-import/types.ts`
- Create: `src/lib/wechat-import/schema.ts`
- Create: `src/lib/wechat-import/report.ts`
- Create: `src/lib/wechat-import/state-machine.ts`
- Create: `src/lib/wechat-import/schema.test.ts`
- Create: `src/lib/wechat-import/report.test.ts`
- Create: `src/lib/wechat-import/state-machine.test.ts`

**Interfaces:**
- Produces: `ArticleBlock`、`WeChatRewriteDraft`、`WeChatEditorDraft`、`WeChatImportReport`、`WeChatImportView`。
- Produces: `parseStoredBlocks(value)`、`parseRewriteDraft(value)`、`createReport(stage, input)`、`assertTransition(from, to)`。

- [ ] **Step 1: 寫 types 與 failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import { parseRewriteDraft, parseStoredBlocks } from "./schema";

const blocks = [
  { id: "b-0001", type: "text", html: "<p>內文</p>" },
  { id: "b-0002", type: "image", assetId: "asset-1", alt: "示意圖" },
] as const;

describe("WeChat import schemas", () => {
  it("accepts canonical blocks and a complete editor-compatible rewrite", () => {
    expect(parseStoredBlocks(blocks)).toEqual(blocks);
    expect(parseRewriteDraft({ title: "標題", slug: "wechat-guide", excerpt: "摘要", blocks, seoTitle: "SEO 標題", seoDescription: "SEO 描述", seoKeywords: "微信,教學", needsVerification: [] }).blocks).toEqual(blocks);
  });

  it("rejects unknown block types and invalid slugs", () => {
    expect(() => parseStoredBlocks([{ id: "b-1", type: "video", src: "x" }])).toThrow();
    expect(() => parseRewriteDraft({ title: "標題", slug: "中文 slug", excerpt: "摘要", blocks, seoTitle: "SEO", seoDescription: "描述", seoKeywords: "關鍵字", needsVerification: [] })).toThrow();
  });
});
```

狀態測試逐一 assert spec 第 12 節主流程、`REWRITTEN -> REWRITE_QUEUED`、failure retry、ABANDONED／EXPIRED terminal rejection。

- [ ] **Step 2: 執行三個測試並確認 module not found**

Run: `npm test -- src/lib/wechat-import/schema.test.ts src/lib/wechat-import/report.test.ts src/lib/wechat-import/state-machine.test.ts`

Expected: FAIL，三個 implementation modules 尚不存在。

- [ ] **Step 3: 實作 domain types 與嚴格 schemas**

`types.ts` 定義：

```ts
export type ArticleBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; assetId: string; alt: string };

export type WeChatRewriteDraft = {
  title: string; slug: string; excerpt: string; blocks: ArticleBlock[];
  seoTitle: string; seoDescription: string; seoKeywords: string;
  needsVerification: string[];
};

export type WeChatEditorDraft = Omit<WeChatRewriteDraft, "blocks"> & {
  sourceImportId: string; coverImage: string; contentHtml: string;
};

export const weChatImportErrorCodes = [
  "INVALID_URL", "SOURCE_LOGIN_REQUIRED", "SOURCE_VERIFICATION_REQUIRED", "SOURCE_DELETED",
  "SOURCE_ACCESS_DENIED", "FETCH_TIMEOUT", "FETCH_REDIRECT_REJECTED", "BODY_MISSING",
  "CONTENT_INCOMPLETE", "HTML_LIMIT_EXCEEDED", "ASSET_LIMIT_EXCEEDED", "ASSET_HOST_REJECTED",
  "ASSET_DOWNLOAD_FAILED", "ASSET_TYPE_INVALID", "ASSET_DECODE_FAILED", "LLM_FAILED",
  "LLM_RESULT_UNKNOWN", "LLM_OUTPUT_INVALID", "IMAGE_SET_MISMATCH", "R2_UPLOAD_FAILED",
  "IMPORT_EXPIRED",
] as const;
```

Zod 使用既有標題、slug、摘要與 SEO 上限；stored JSON 一律先 parse，不直接 type assertion。

- [ ] **Step 4: 實作 report 與顯式 transition table**

```ts
const transitions: Record<WeChatImportStatus, readonly WeChatImportStatus[]> = {
  FETCH_QUEUED: ["FETCHING", "ABANDONED", "EXPIRED"],
  FETCHING: ["FETCHED", "FAILED", "FETCH_QUEUED", "ABANDONED"],
  FETCHED: ["REWRITE_QUEUED", "FETCH_QUEUED", "ABANDONED", "EXPIRED"],
  REWRITE_QUEUED: ["REWRITING", "ABANDONED", "EXPIRED"],
  REWRITING: ["REWRITTEN", "FAILED", "UNKNOWN"],
  REWRITTEN: ["REWRITE_QUEUED", "TRANSFER_QUEUED", "ABANDONED", "EXPIRED"],
  TRANSFER_QUEUED: ["TRANSFERRING", "ABANDONED", "EXPIRED"],
  TRANSFERRING: ["READY", "TRANSFER_FAILED"],
  TRANSFER_FAILED: ["TRANSFER_QUEUED", "ABANDONED", "EXPIRED"],
  READY: [], FAILED: ["FETCH_QUEUED", "REWRITE_QUEUED", "ABANDONED", "EXPIRED"],
  UNKNOWN: ["REWRITE_QUEUED", "ABANDONED", "EXPIRED"], ABANDONED: ["EXPIRED"], EXPIRED: [],
};
```

`createReport` 強制 ISO `generated_at`、固定 stage/status 與陣列，`errorSummary` 輸出前截至 500 字元。

- [ ] **Step 5: 重跑 tests 與 typecheck**

Run: `npm test -- src/lib/wechat-import/schema.test.ts src/lib/wechat-import/report.test.ts src/lib/wechat-import/state-machine.test.ts && npx tsc --noEmit`

Expected: PASS，無 TypeScript error。

- [ ] **Step 6: Commit**

```bash
git add src/lib/wechat-import/types.ts src/lib/wechat-import/schema.ts src/lib/wechat-import/report.ts src/lib/wechat-import/state-machine.ts src/lib/wechat-import/schema.test.ts src/lib/wechat-import/report.test.ts src/lib/wechat-import/state-machine.test.ts
git commit -m "feat: define WeChat import contracts"
```

### Task 3: 實作 URL policy、固定 DNS 解析與 redirect 防護

**Files:**
- Create: `src/lib/wechat-import/url-policy.ts`
- Create: `src/lib/wechat-import/url-policy.test.ts`

**Interfaces:**
- Produces: `normalizeWeChatArticleUrl(raw: string): URL`。
- Produces: `resolvePublicAddress(hostname, lookup?): Promise<{ address: string; family: 4 | 6 }>`。
- Produces: `safeHttpsGet(url, options): Promise<{ finalUrl: URL; status: number; headers: Headers; body: Buffer }>`。
- Produces: `assertAllowedWeChatImageUrl(url): URL`。

- [ ] **Step 1: 寫 URL 與 network policy failing tests**

測試包含：接受標準 `/s/`；拒絕 http、userinfo、自訂 port、非微信 host、`/cgi-bin/`、2,049 字元；拒絕 `127.0.0.1`、`10/8`、`172.16/12`、`192.168/16`、`169.254/16`、`::1`、`fc00::/7`、`fe80::/10`；redirect 到非 allowlist；最多五次 redirect；2 MB body 立即 abort。

```ts
it("normalizes only public WeChat article URLs", () => {
  expect(normalizeWeChatArticleUrl(" https://mp.weixin.qq.com/s/abc#section ").toString()).toBe("https://mp.weixin.qq.com/s/abc");
  for (const value of ["http://mp.weixin.qq.com/s/abc", "https://user@mp.weixin.qq.com/s/abc", "https://mp.weixin.qq.com:8443/s/abc", "https://example.com/s/abc"]) {
    expect(() => normalizeWeChatArticleUrl(value)).toThrow(/公開微信文章/);
  }
});

it("rejects a DNS answer in a private network", async () => {
  await expect(resolvePublicAddress("mp.weixin.qq.com", async () => [{ address: "127.0.0.1", family: 4 }] as never)).rejects.toThrow(/公開網路/);
});
```

- [ ] **Step 2: 執行測試並確認 exports 不存在**

Run: `npm test -- src/lib/wechat-import/url-policy.test.ts`

Expected: FAIL，cannot find module／export。

- [ ] **Step 3: 實作 parser、IP ranges 與 pinned HTTPS request**

`safeHttpsGet` 使用 `node:https.request`、`redirect: manual` 等價流程；每一跳重新 normalize／allowlist，並透過 request `lookup` callback 回傳已驗證的單一 address，使 DNS 驗證與實際 socket 使用相同 IP。TLS `servername` 保持原 hostname。串流累加前先檢查 `Content-Length`，讀取中超過上限立即 destroy request。

微信圖片 allowlist 起始值固定為：

```ts
const allowedImageHosts = new Set(["mmbiz.qpic.cn", "mmbiz.qlogo.cn"]);
```

只有新增 fixture 證明微信實際需要時才擴充，不允許 suffix 模糊比對。

- [ ] **Step 4: 重跑 policy tests**

Run: `npm test -- src/lib/wechat-import/url-policy.test.ts`

Expected: PASS，涵蓋 IPv4、IPv6、redirect、body limit 與 image host。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wechat-import/url-policy.ts src/lib/wechat-import/url-policy.test.ts
git commit -m "feat: secure WeChat source requests"
```

### Task 4: 解析微信 HTML 並建立 canonical blocks

**Files:**
- Create: `src/lib/wechat-import/parse-wechat-html.ts`
- Create: `src/lib/wechat-import/normalize-content.ts`
- Create: `src/lib/wechat-import/parse-wechat-html.test.ts`
- Create: `src/lib/wechat-import/normalize-content.test.ts`
- Create: `src/lib/wechat-import/fixtures/standard-article.html`
- Create: `src/lib/wechat-import/fixtures/share-image-article.html`
- Create: `src/lib/wechat-import/fixtures/verification-page.html`
- Create: `src/lib/wechat-import/fixtures/deleted-page.html`

**Interfaces:**
- Consumes: `ArticleBlock` from Task 2。
- Produces: `parseWeChatHtml(html, sourceUrl): ParsedWeChatArticle`。
- Produces: `normalizeWeChatContent(parsed): { sanitizedHtml; blocks; imageRequests; warnings }`。
- Produces: `assertCompleteArticle(result): void` with stable source error codes。

- [ ] **Step 1: 建立最小去識別 fixtures 與 failing tests**

Fixtures 只保留 parser 所需 DOM／script，不保存真實完整文章。標準 fixture 必須含 `#activity-name`、`#js_name`、`#js_author_name`、`#publish_time`、`#js_content`、`data-src`、隱藏追蹤圖與惡意 script。新版 fixture 必須含 spec 支援的 share image script fallback。

```ts
it("extracts metadata and prefers data-src without keeping page scripts", () => {
  const parsed = parseWeChatHtml(standardHtml, new URL("https://mp.weixin.qq.com/s/example"));
  const normalized = normalizeWeChatContent(parsed);
  expect(parsed).toMatchObject({ title: "範例標題", accountName: "範例公眾號", author: "範例作者" });
  expect(normalized.imageRequests.map(item => item.url)).toEqual(["https://mmbiz.qpic.cn/article-image?wx_fmt=jpeg"]);
  expect(normalized.sanitizedHtml).not.toMatch(/script|onclick|visibility:\s*hidden/i);
  expect(normalized.blocks.map(block => block.type)).toEqual(["text", "image", "text"]);
});
```

- [ ] **Step 2: 執行 parser tests 並確認失敗**

Run: `npm test -- src/lib/wechat-import/parse-wechat-html.test.ts src/lib/wechat-import/normalize-content.test.ts`

Expected: FAIL，implementation modules 尚不存在。

- [ ] **Step 3: 實作 metadata fallback、錯誤 signature 與 sanitizer**

使用現有 `cheerio`；JS string decoder 只解碼已知欄位，不 eval script。將來源 h1 轉 h2、移除 style/class/id/data/event attributes、拒絕 iframe／form／SVG；文字元素依 DOM 順序累積成 text blocks，圖片轉 image request placeholder。block ID 使用 `b-${String(index).padStart(4, "0")}`。

錯誤頁 mapping：verification → `SOURCE_VERIFICATION_REQUIRED`；login → `SOURCE_LOGIN_REQUIRED`；deleted／violations → `SOURCE_DELETED` 或 `SOURCE_ACCESS_DENIED`；無 body → `BODY_MISSING`；清理後空白 → `CONTENT_INCOMPLETE`。

- [ ] **Step 4: 重跑 parser tests 與既有 sanitizer regression**

Run: `npm test -- src/lib/wechat-import/parse-wechat-html.test.ts src/lib/wechat-import/normalize-content.test.ts src/lib/content/sanitize.test.ts`

Expected: PASS；既有文章 sanitizer 行為不變。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wechat-import/parse-wechat-html.ts src/lib/wechat-import/normalize-content.ts src/lib/wechat-import/parse-wechat-html.test.ts src/lib/wechat-import/normalize-content.test.ts src/lib/wechat-import/fixtures
git commit -m "feat: parse WeChat articles into safe blocks"
```

### Task 5: 實作圖片驗證、下載與 HTTP extractor

**Files:**
- Create: `src/lib/wechat-import/asset-fetcher.ts`
- Create: `src/lib/wechat-import/http-extractor.ts`
- Create: `src/lib/wechat-import/asset-fetcher.test.ts`
- Create: `src/lib/wechat-import/http-extractor.test.ts`

**Interfaces:**
- Consumes: `safeHttpsGet`、`ParsedWeChatArticle`、normalized image requests。
- Produces: `fetchWeChatAssets(requests, options): Promise<StagedAssetResult>`。
- Produces: `extractViaHttp(sourceUrl, dependencies?): Promise<ExtractedWeChatArticle>`。

- [ ] **Step 1: 寫 image limits、magic bytes、dedupe 與 HTTP orchestration failing tests**

使用 Sharp 在測試內產生 8×8 PNG／JPEG bytes。測試 exact MIME、10 MB 單圖、100 MB aggregate、101 張正文圖、四並行、15 秒 signal、相同 URL 重複位置、無封面 warning、任一正文圖失敗形成 `failure` 而不是靜默成功。

```ts
it("stages verified bytes while preserving duplicate image positions", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
  const request = vi.fn(async () => ({ finalUrl: new URL("https://mmbiz.qpic.cn/a"), status: 200, headers: new Headers({ "content-type": "image/png" }), body: png }));
  const result = await fetchWeChatAssets([
    { position: 0, isCover: false, url: "https://mmbiz.qpic.cn/a", alt: "第一處" },
    { position: 1, isCover: false, url: "https://mmbiz.qpic.cn/a", alt: "第二處" },
  ], { request });
  expect(result.assets).toHaveLength(2);
  expect(result.assets[0].sha256).toBe(result.assets[1].sha256);
  expect(result.assets.map(asset => asset.position)).toEqual([0, 1]);
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/lib/wechat-import/asset-fetcher.test.ts src/lib/wechat-import/http-extractor.test.ts`

Expected: FAIL，implementation modules 尚不存在。

- [ ] **Step 3: 實作下載 semaphore、格式判斷與 HTTP extraction**

`asset-fetcher.ts` 只接受 JPEG／PNG／WebP／GIF magic bytes；Sharp 使用 `{ limitInputPixels: 40_000_000, failOn: "error", animated: true }` 讀 metadata。封面失敗寫 warning；正文圖片失敗寫 `failure` 並令 `complete=false`。`http-extractor.ts` 用 2 MB body limit，串接 parse → normalize → assets → report，回傳 `fetchMethod: "HTTP"`。

- [ ] **Step 4: 重跑 tests**

Run: `npm test -- src/lib/wechat-import/asset-fetcher.test.ts src/lib/wechat-import/http-extractor.test.ts`

Expected: PASS，report 的 expected/successful/failed images 數一致。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wechat-import/asset-fetcher.ts src/lib/wechat-import/http-extractor.ts src/lib/wechat-import/asset-fetcher.test.ts src/lib/wechat-import/http-extractor.test.ts
git commit -m "feat: fetch verified WeChat article assets"
```

### Task 6: 加入受限 Chromium fallback 與獨立 Worker image target

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/wechat-import/browser-extractor.ts`
- Create: `src/lib/wechat-import/browser-extractor.test.ts`
- Modify: `Dockerfile`

**Interfaces:**
- Consumes: `resolvePublicAddress`、`parseWeChatHtml`、`normalizeWeChatContent`、`fetchWeChatAssets`。
- Produces: `extractViaBrowser(sourceUrl, options): Promise<ExtractedWeChatArticle>` with `fetchMethod: "CHROMIUM"`。
- Produces: Docker target `wechat-worker-runtime` with `/usr/bin/chromium`。

- [ ] **Step 1: 安裝與測試版本一致的 runtime client**

Run: `npm install playwright-core@1.62.1`

Expected: `package.json` dependencies 出現精確 `playwright-core` 版本，lockfile 更新。

- [ ] **Step 2: 寫 browser policy failing tests**

Mock `chromium.launch`、browser、page 與 route。驗證 launch 使用 temporary user data、headless、60 秒；`--host-resolver-rules=MAP mp.weixin.qq.com <validated-ip>,EXCLUDE localhost` 固定主機解析；route 只允許主 document 與 `mp.weixin.qq.com` 必需請求，其他 host 全部 abort；頁面會 scroll 並執行 `img[data-src]` materialize；finally 關閉 context/browser。

```ts
expect(launch).toHaveBeenCalledWith(expect.objectContaining({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: expect.arrayContaining(["--host-resolver-rules=MAP mp.weixin.qq.com 93.184.216.34,EXCLUDE localhost"]),
}));
expect(abort).toHaveBeenCalled();
```

- [ ] **Step 3: 執行 test 並確認 implementation 不存在**

Run: `npm test -- src/lib/wechat-import/browser-extractor.test.ts`

Expected: FAIL，browser extractor 尚不存在。

- [ ] **Step 4: 實作 browser extractor 與 cleanup**

不使用持久 profile；先解析並固定 `mp.weixin.qq.com` 的公開 IP，所有非必要網路請求 abort，圖片仍由 Task 5 的安全 fetcher 下載。`page.goto` 若 redirect 後 URL 不再符合 article policy，拋 `FETCH_REDIRECT_REJECTED`。DOM ready 後逐步滾動最多 40 次、每次 200 ms，第二次 materialize `data-src`，再 `page.content()` 送入相同 parser／normalizer。

- [ ] **Step 5: 將 Dockerfile 拆成不污染 Web 的 targets**

建立共用 build stage 與 app runtime；`wechat-worker-runtime` 從 app runtime 延伸，只安裝 Debian Chromium 與必要字型／共享庫。確認 Web 最終 target 不含 `chromium` package。以 container command 驗證：

Run: `docker build --target wechat-worker-runtime -t onewiki-wechat-worker:test . && docker run --rm onewiki-wechat-worker:test /usr/bin/chromium --version`

Expected: 輸出 Chromium version，exit 0。

Run: `docker build --target app-runtime -t onewiki-web:test . && ! docker run --rm onewiki-web:test sh -c 'command -v chromium'`

Expected: exit 0，證明一般 Web image 找不到 Chromium binary。

- [ ] **Step 6: 重跑 browser test 與 production dependency check**

Run: `npm test -- src/lib/wechat-import/browser-extractor.test.ts && npm ls playwright-core`

Expected: PASS；只解析到 `playwright-core@1.62.1`。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json Dockerfile src/lib/wechat-import/browser-extractor.ts src/lib/wechat-import/browser-extractor.test.ts
git commit -m "feat: add isolated WeChat browser fallback"
```

### Task 7: 建立 repository、原子 claim 與 fetch Worker 階段

**Files:**
- Create: `src/lib/wechat-import/repository.ts`
- Create: `src/lib/wechat-import/repository.test.ts`
- Create: `src/lib/wechat-import/worker.ts`
- Create: `src/lib/wechat-import/worker.test.ts`

**Interfaces:**
- Consumes: Prisma delegates、Task 5/6 extractors、Task 2 state/report parsers。
- Produces: `createWeChatImport(client, userId, input, now): Promise<WeChatImport>`。
- Produces: `getWeChatImportForUser(client, importId, user): Promise<WeChatImportView>`。
- Produces: `retryTargetFor(import): "FETCH_QUEUED" | "REWRITE_QUEUED" | "TRANSFER_QUEUED"`，完全由 server-side `failureStage` 與 status 決定。
- Produces: `processNextWeChatImport(client, dependencies): Promise<boolean>`。
- Produces: `recoverWeChatImportJobs(client, now): Promise<void>`。

- [ ] **Step 1: 寫 transaction-based integration failing tests**

沿用 `src/lib/ai/image-worker.test.ts` 的 transaction rollback pattern。測試兩個 concurrent processor 只一個 claim、HTTP complete 不呼叫 browser、HTTP incomplete 呼叫 browser、FETCHING expired lease 回 queue、inactive／mustChangePassword user 失敗、staged assets 與 report 原子保存，以及 FAILED 只能依保存的 fetch/rewrite failureStage 回到對應 queue。

```ts
const [first, second] = await Promise.all([
  processNextWeChatImport(client, deps),
  processNextWeChatImport(client, deps),
]);
expect([first, second].filter(Boolean)).toHaveLength(1);
expect(deps.extractHttp).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: 執行 repository／worker tests 並確認失敗**

Run: `npm test -- src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.test.ts`

Expected: FAIL，modules 尚不存在。

- [ ] **Step 3: 實作 create、ownership、view 與 claim**

`createWeChatImport` normalize URL、設定 `expiresAt = now + 24h`；existing work query 限同一 user、normalized URL、未到期且非 terminal。claim 使用 `updateMany({ where: { id, status: "FETCH_QUEUED" }, data: { status: "FETCHING", leaseExpiresAt } })` compare-and-set。

- [ ] **Step 4: 實作 fetch stage 與 recover**

先呼叫 HTTP；只有 `complete=false` 或 `BODY_MISSING`／`CONTENT_INCOMPLETE` 才 browser fallback，登入／驗證／刪除／access denied 不 fallback。成功時在單一 transaction 刪除舊未轉存 assets、建立新 staged assets、保存 blocks／metadata／hash／report、轉 `FETCHED`。所有外部錯誤轉穩定 code，stack 不入 DB。

- [ ] **Step 5: 重跑 tests**

Run: `npm test -- src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.test.ts`

Expected: PASS，concurrency 與 fallback assertions 全部成立。

- [ ] **Step 6: Commit**

```bash
git add src/lib/wechat-import/repository.ts src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.ts src/lib/wechat-import/worker.test.ts
git commit -m "feat: process durable WeChat fetch jobs"
```

### Task 8: 建立 actions、polling API、登入圖片預覽與原文 UI

**Files:**
- Create: `src/app/(backoffice)/admin/posts/wechat/actions.ts`
- Create: `src/app/(backoffice)/admin/posts/wechat/actions.test.ts`
- Create: `src/app/api/admin/wechat-imports/[id]/route.ts`
- Create: `src/app/api/admin/wechat-imports/[id]/route.test.ts`
- Create: `src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.ts`
- Create: `src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.test.ts`
- Create: `src/app/(backoffice)/admin/posts/wechat/page.tsx`
- Create: `src/components/admin/wechat-import-workbench.tsx`
- Create: `src/components/admin/wechat-source-preview.tsx`
- Create: `src/components/admin/wechat-import-workbench.test.tsx`
- Modify: `src/app/(backoffice)/admin/posts/create/page.tsx`
- Modify: `src/app/(backoffice)/admin/posts/create/page.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: repository view/create from Task 7。
- Produces: `createWeChatImportAction({ sourceUrl, targetLocale, forceNew })`。
- Produces: `retryWeChatImportAction({ importId })`、`abandonWeChatImportAction({ importId })`、`removeWeChatImportAssetAction({ importId, assetId })`。
- Produces: authenticated GET view and asset bytes routes。
- Produces: client workbench with polling while queued/running。

- [ ] **Step 1: 閱讀指定 Next.js 16 local docs**

Run: `sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md && sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md && sed -n '1,260p' node_modules/next/dist/docs/01-app/02-guides/server-actions.md && sed -n '1,240p' node_modules/next/dist/docs/01-app/02-guides/data-security.md && sed -n '1,220p' node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`

Expected: 確認 Server Actions 與 Route Handlers 的當前授權、runtime 與 response API。

- [ ] **Step 2: 寫 auth、ownership、headers、polling 與入口 failing tests**

Asset route 必測：401、mustChangePassword 403、他人 import 404、bytes 200、已清 bytes 但 publicUrl 存在時 302、已到期 410；200 response headers 包含 `private, no-store` 與 `nosniff`。Actions 必測相同 URL 回 `existingImportId`、`forceNew` 建立新工作、依 `failureStage`／目前狀態重新擷取、放棄工作，以及只允許移除目前使用者匯入中的失敗正文圖片。Workbench 必測建立工作、2 秒 polling、FETCHED 後停止 polling、完整原文、圖片失敗 gate、明確刪除失敗圖片 block 後解除 gate、頁面重整以 `?import=<id>` 恢復。

入口測試更新：

```ts
expect(screen.getByRole("link", { name: "開始微信文章改寫" })).toHaveAttribute("href", "/admin/posts/wechat");
expect(screen.getAllByRole("link")).toHaveLength(4);
```

- [ ] **Step 3: 執行 targeted tests 並確認失敗**

Run: `npm test -- 'src/app/(backoffice)/admin/posts/create/page.test.tsx' 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts' 'src/app/api/admin/wechat-imports/[id]/route.test.ts' 'src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.test.ts' src/components/admin/wechat-import-workbench.test.tsx`

Expected: FAIL，新 routes／components 尚不存在，入口仍只有三張卡。

- [ ] **Step 4: 實作 actions 與 routes**

所有 action/route 重新呼叫 `getCurrentUser()`；action 只回 serializable `{ ok, importId?, existingImportId?, error? }`。`retryWeChatImportAction` 依 `failureStage` 選 `FETCH_QUEUED` 或 `REWRITE_QUEUED`，不得由 client 指定目標 status。`removeWeChatImportAssetAction` 只把 FETCHED 階段中 status FAILED 的非封面 asset 設為 REMOVED，並從 canonical blocks 移除該 asset block、重建 report；成功圖片與封面不可用此 action 刪除。輪詢 view 不回 bytes、raw provider response 或 stack。Asset route 驗證 import ownership 和 asset relation，不能只用 asset ID 查詢。

- [ ] **Step 5: 實作四階段 shell 的前兩階段與入口**

Workbench props：

```ts
type WeChatImportWorkbenchProps = {
  initialImport: WeChatImportView | null;
  provider: string;
  categories: CategoryOption[];
  authors: AuthorOption[];
};
```

UI 使用 URL query 保存 import ID；polling 只在 `FETCH_QUEUED`、`FETCHING`、後續 queued/running 狀態啟用，unmount 時 clear timeout。原文 HTML 已由 server sanitizer 處理，但 component 仍只 render view 中的 `previewHtml`。

- [ ] **Step 6: 重跑 tests**

Run: `npm test -- 'src/app/(backoffice)/admin/posts/create/page.test.tsx' 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts' 'src/app/api/admin/wechat-imports/[id]/route.test.ts' 'src/app/api/admin/wechat-imports/[id]/assets/[assetId]/route.test.ts' src/components/admin/wechat-import-workbench.test.tsx`

Expected: PASS，四張入口卡、auth/ownership 與原文 preview flow 完成。

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(backoffice)/admin/posts/create' 'src/app/(backoffice)/admin/posts/wechat' 'src/app/api/admin/wechat-imports' src/components/admin/wechat-import-workbench.tsx src/components/admin/wechat-source-preview.tsx src/components/admin/wechat-import-workbench.test.tsx src/app/globals.css
git commit -m "feat: preview imported WeChat articles"
```

### Task 9: 新增微信 Prompt definition 與 block rewrite engine

**Files:**
- Modify: `src/lib/ai/prompt-definitions.ts`
- Modify: `src/lib/ai/prompt-repository.test.ts`
- Create: `prisma/migrations/20260907140000_add_wechat_rewrite_prompt/migration.sql`
- Modify: `tests/integration/prompt-usage-schema.test.ts`
- Create: `src/lib/wechat-import/rewrite.ts`
- Create: `src/lib/wechat-import/rewrite.test.ts`

**Interfaces:**
- Consumes: `executeLLMCall`、`getLanguageInstruction`、canonical blocks、`WECHAT_ARTICLE_REWRITE` Prompt。
- Produces: `planRewriteChunks(blocks, budget): RewriteChunk[]`。
- Produces: `rewriteWeChatArticle(input, options): Promise<{ draft: WeChatRewriteDraft; calls: number }>`。
- Produces: `assertImageInvariant(mode, sourceBlocks, rewrittenBlocks): void`。

- [ ] **Step 1: 寫 Prompt metadata、migration 與 rewrite failing tests**

更新 Prompt definition count 與 key order，assert allowed/required variables 精確為 spec 第 10.1 節。Rewrite tests 注入 fake `execute`，涵蓋：短文單次；長文 heading boundary 分塊；FAITHFUL exact sequence；DEEP_SEO 可重排但 image set exact once；未知／遺漏／重複 asset；惡意 HTML sanitizer；metadata 最後一 call；needsVerification 上限。

```ts
expect(() => assertImageInvariant("FAITHFUL", sourceBlocks, [sourceBlocks[1], sourceBlocks[0]])).toThrow(/圖片與段落順序/);
expect(() => assertImageInvariant("DEEP_SEO", sourceBlocks, [sourceBlocks[0], sourceBlocks[1], sourceBlocks[1]])).toThrow(/圖片集合/);
```

- [ ] **Step 2: 執行 tests 並確認失敗**

Run: `npm test -- src/lib/wechat-import/rewrite.test.ts src/lib/ai/prompt-repository.test.ts tests/integration/prompt-usage-schema.test.ts`

Expected: FAIL，Prompt key／migration／rewrite implementation 尚不存在。

- [ ] **Step 3: 新增 Prompt key 與 deterministic migration seed**

Migration 以 stable IDs `prompt-wechat-article-rewrite`、`prompt-version-wechat-article-rewrite-v1` 插入 definition/version，使用 `ON CONFLICT DO NOTHING`。System template 明確說來源為不可信資料；user template 包含 mode contract、block JSON、前文摘要與純 JSON 輸出規則。

- [ ] **Step 4: 實作 chunk planner、LLM calls 與 validation**

以 UTF-8 字元估算保守 budget，切點只在 text block boundary；image block 與相鄰 text 不拆散。每次 `executeLLMCall` 都用 `WECHAT_ARTICLE_REWRITE`，讓既有 execution layer 自動寫 LLMUsage。chunk result parse 後立即 sanitize 與 invariant validation；正文全部成功才呼叫 metadata pass 並組成 draft。

- [ ] **Step 5: 部署 migration 並重跑 tests**

Run: `npm run db:migrate && npm test -- src/lib/wechat-import/rewrite.test.ts src/lib/ai/prompt-repository.test.ts tests/integration/prompt-usage-schema.test.ts`

Expected: PASS；definitions 包含 `WECHAT_ARTICLE_REWRITE` 且有 active v1。

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/prompt-definitions.ts src/lib/ai/prompt-repository.test.ts prisma/migrations/20260907140000_add_wechat_rewrite_prompt/migration.sql tests/integration/prompt-usage-schema.test.ts src/lib/wechat-import/rewrite.ts src/lib/wechat-import/rewrite.test.ts
git commit -m "feat: rewrite WeChat articles as safe blocks"
```

### Task 10: 將 rewrite 階段接入 Worker 並處理不確定計費

**Files:**
- Modify: `src/lib/wechat-import/repository.ts`
- Modify: `src/lib/wechat-import/repository.test.ts`
- Modify: `src/lib/wechat-import/worker.ts`
- Modify: `src/lib/wechat-import/worker.test.ts`
- Modify: `src/app/(backoffice)/admin/posts/wechat/actions.ts`
- Modify: `src/app/(backoffice)/admin/posts/wechat/actions.test.ts`

**Interfaces:**
- Consumes: `rewriteWeChatArticle` from Task 9。
- Produces: `queueWeChatRewrite(client, userId, importId, mode)`。
- Extends: `processNextWeChatImport` handles `REWRITE_QUEUED`。

- [ ] **Step 1: 寫 queue idempotency、success、failure 與 UNKNOWN failing tests**

測試 concurrent click 只 queue 一次；FETCHED 可 queue；REWRITTEN 可明確再 queue；TRANSFER 之後拒絕。Worker success 保存 validated draft/report；明確 provider error → FAILED/LLM_FAILED；`resultUnknown=true` 或 REWRITING expired lease → UNKNOWN/LLM_RESULT_UNKNOWN；recover 不把 UNKNOWN 回 queue。

```ts
await client.weChatImport.update({ where: { id }, data: { status: "REWRITING", leaseExpiresAt: new Date(0) } });
await recoverWeChatImportJobs(client, new Date());
expect(await client.weChatImport.findUnique({ where: { id }, select: { status: true, errorCode: true } })).toEqual({ status: "UNKNOWN", errorCode: "LLM_RESULT_UNKNOWN" });
```

- [ ] **Step 2: 執行 targeted tests 並確認 fail**

Run: `npm test -- src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.test.ts 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'`

Expected: FAIL，rewrite queue／worker branch 未實作。

- [ ] **Step 3: 實作 queue action 與 worker rewrite branch**

Queue transaction 更新 mode、清除舊 draft/editor draft、延長 expiresAt 24h、轉 `REWRITE_QUEUED`。Worker claim `REWRITE_QUEUED -> REWRITING` 後呼叫 rewrite engine；只在完整 draft validation 成功後轉 `REWRITTEN`。錯誤摘要不得包含來源全文或 provider raw body。

- [ ] **Step 4: 重跑 tests**

Run: `npm test -- src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.test.ts 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'`

Expected: PASS，UNKNOWN 不會被 worker 自動重送。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wechat-import/repository.ts src/lib/wechat-import/repository.test.ts src/lib/wechat-import/worker.ts src/lib/wechat-import/worker.test.ts 'src/app/(backoffice)/admin/posts/wechat/actions.ts' 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'
git commit -m "feat: run durable WeChat rewrite jobs"
```

### Task 11: 建立改寫比較 UI 與確認 gate

**Files:**
- Create: `src/components/admin/wechat-rewrite-review.tsx`
- Create: `src/components/admin/wechat-rewrite-review.test.tsx`
- Modify: `src/components/admin/wechat-import-workbench.tsx`
- Modify: `src/components/admin/wechat-import-workbench.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: rewrite action、`WeChatImportView` rewritten preview、provider name。
- Produces: FAITHFUL/DEEP_SEO selector、original/rewritten tabs、verification warnings、queue transfer action。

- [ ] **Step 1: 寫 UI failing tests**

測試預設 FAITHFUL、切換 DEEP_SEO、loading 防重複、polling 直到 REWRITTEN、原文／改寫切換、SEO fields、圖片 invariant summary、needsVerification、UNKNOWN 明確重新改寫按鈕、圖片 failure 時 transfer button disabled。

```ts
expect(screen.getByRole("radio", { name: "忠實轉譯＋SEO" })).toBeChecked();
fireEvent.click(screen.getByRole("button", { name: "開始改寫" }));
expect(queueWeChatRewriteAction).toHaveBeenCalledWith({ importId: "import-1", mode: "FAITHFUL" });
expect(await screen.findByRole("button", { name: "確認改寫並轉存圖片" })).toBeEnabled();
```

- [ ] **Step 2: 執行 tests 並確認 component 不存在／流程不完整**

Run: `npm test -- src/components/admin/wechat-rewrite-review.test.tsx src/components/admin/wechat-import-workbench.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 實作比較 component 與 workbench stage routing**

不要把兩份全文同時插入 DOM；tabs 只 render active preview，降低大文章記憶體。顯示 provider、aggregated token/duration/cost 若 view 有值。確認按鈕只在 `REWRITTEN`、`assetFailures=0`、`imageInvariantValid=true` 啟用。

- [ ] **Step 4: 重跑 component tests**

Run: `npm test -- src/components/admin/wechat-rewrite-review.test.tsx src/components/admin/wechat-import-workbench.test.tsx`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/wechat-rewrite-review.tsx src/components/admin/wechat-rewrite-review.test.tsx src/components/admin/wechat-import-workbench.tsx src/components/admin/wechat-import-workbench.test.tsx src/app/globals.css
git commit -m "feat: review WeChat rewrite results"
```

### Task 12: 實作 R2 冪等轉存與 immutable editor draft

**Files:**
- Modify: `src/lib/media/r2.ts`
- Modify: `src/lib/media/image-upload.test.ts`
- Create: `src/lib/wechat-import/r2-transfer.ts`
- Create: `src/lib/wechat-import/r2-transfer.test.ts`
- Modify: `src/lib/wechat-import/worker.ts`
- Modify: `src/lib/wechat-import/worker.test.ts`
- Modify: `src/lib/wechat-import/repository.ts`
- Modify: `src/app/(backoffice)/admin/posts/wechat/actions.ts`
- Modify: `src/app/(backoffice)/admin/posts/wechat/actions.test.ts`

**Interfaces:**
- Produces: `uploadPublicImage(key, bytes, mimeType): Promise<string>` as generic replacement/alias for generated-only upload。
- Produces: `weChatAssetObjectKey(importId, asset): string`。
- Produces: `transferPendingAssets(client, importId, dependencies): Promise<TransferResult>`。
- Produces: `buildWeChatEditorDraft(import, assets): WeChatEditorDraft`。
- Produces: `queueWeChatTransfer(client, userId, importId)`。

- [ ] **Step 1: 寫 fixed key、partial failure、retry 與 assembly failing tests**

建立三個 assets，upload mock 第二張第一次失敗。第一次執行後第一、三張 READY/bytes null，第二張 FAILED/bytes retained；retry 只呼叫第二張；LLM dependency call count 保持 0。組裝時所有 preview references 必須換成 public URL，不能殘留 `wechat-asset://` 或 `/api/admin/wechat-imports/`。

```ts
expect(weChatAssetObjectKey("import-1", asset)).toBe(`wechat-imports/import-1/${asset.sha256.slice(0, 16)}-${asset.id}.png`);
expect(upload.mock.calls.map(call => call[0])).toEqual([
  expect.stringContaining("asset-1"), expect.stringContaining("asset-2"), expect.stringContaining("asset-3"),
]);
expect(secondPassUploadedIds).toEqual(["asset-2"]);
```

- [ ] **Step 2: 執行 tests 並確認 fail**

Run: `npm test -- src/lib/wechat-import/r2-transfer.test.ts src/lib/wechat-import/worker.test.ts 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'`

Expected: FAIL，transfer module／worker branch 未實作。

- [ ] **Step 3: 泛化後端 R2 upload helper 並實作 per-asset claim**

保留既有 `uploadGeneratedImage` export 以免破壞 image worker，讓它 delegate 至 `uploadPublicImage`。Asset claim 僅允許 `STAGED|FAILED -> UPLOADING` 且 bytes 不為 null。成功 update 必須帶相同 lease condition；失敗保留 bytes、增加 attempts、寫 `R2_UPLOAD_FAILED`。

- [ ] **Step 4: 實作 import transfer branch 與 editor draft assembly**

Queue 僅允許 REWRITTEN。所有 referenced assets READY 才 sanitize 組裝 HTML、設定 cover、保存 editorDraft、清除 sourceContentHtml/sourceBlocks/rewrittenDraft 中不再需要的大型重複 payload並轉 READY；任何 asset failed 則 TRANSFER_FAILED。已 READY import 重複 action 回現有結果。

- [ ] **Step 5: 重跑 tests**

Run: `npm test -- src/lib/media/image-upload.test.ts src/lib/wechat-import/r2-transfer.test.ts src/lib/wechat-import/worker.test.ts 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'`

Expected: PASS；既有 AI image upload helper regression 不變。

- [ ] **Step 6: Commit**

```bash
git add src/lib/media/r2.ts src/lib/media/image-upload.test.ts src/lib/wechat-import/r2-transfer.ts src/lib/wechat-import/r2-transfer.test.ts src/lib/wechat-import/worker.ts src/lib/wechat-import/worker.test.ts src/lib/wechat-import/repository.ts 'src/app/(backoffice)/admin/posts/wechat/actions.ts' 'src/app/(backoffice)/admin/posts/wechat/actions.test.ts'
git commit -m "feat: transfer confirmed WeChat images to R2"
```

### Task 13: 將 READY draft 交給 PostEditor 並保存 sourceImportId

**Files:**
- Modify: `src/components/admin/post-editor.tsx`
- Modify: `src/components/admin/post-editor.test.tsx`
- Modify: `src/components/admin/wechat-import-workbench.tsx`
- Modify: `src/components/admin/wechat-import-workbench.test.tsx`
- Modify: `src/app/(backoffice)/admin/posts/actions.ts`
- Modify: `src/app/(backoffice)/admin/posts/actions.test.ts`
- Modify: `src/lib/content/repository.ts`
- Modify: `src/lib/content/repository.test.ts`

**Interfaces:**
- Consumes: `WeChatEditorDraft` from Task 2/12。
- Extends: `PostEditor` prop `initialImportDraft?: WeChatEditorDraft`。
- Extends: post save input optional `sourceImportId?: string | null` with ownership/READY/unused validation。

- [ ] **Step 1: 寫 editor prefill 與 save provenance failing tests**

Assert locale、title、slug、excerpt、cover、content、SEO、hidden `sourceImportId`；分類與作者仍顯示且 required；沒有自動 submit。Repository/action integration 建立 Post 後 relation 存在；別人的 import、非 READY、已被另一 Post 使用皆拒絕；公開 article query/renderer 不輸出 source fields。

```ts
expect(screen.getByLabelText("標題")).toHaveValue("轉譯標題");
expect(screen.getByLabelText("封面圖片網址")).toHaveValue("https://media.example.com/wechat-imports/cover.webp");
expect(screen.getByLabelText("文章正文").querySelectorAll("img")).toHaveLength(2);
expect(screen.getByDisplayValue("import-1")).toHaveAttribute("name", "sourceImportId");
expect(savePostAction).not.toHaveBeenCalled();
```

- [ ] **Step 2: 執行 targeted tests 並確認 fail**

Run: `npm test -- src/components/admin/post-editor.test.tsx src/components/admin/wechat-import-workbench.test.tsx 'src/app/(backoffice)/admin/posts/actions.test.ts' src/lib/content/repository.test.ts`

Expected: FAIL，PostEditor/save contract 尚未支援 import draft。

- [ ] **Step 3: 實作 PostEditor backward-compatible prop**

既有 `initialGenerated` 保持不變；`initialImportDraft` 優先於它，coverImage 取 import draft，並輸出 hidden sourceImportId。Workbench READY 顯示「放入文章編輯器」，按下只切換 client stage，不呼叫 save。

- [ ] **Step 4: 實作 server-side provenance validation**

不能信任 hidden input。`savePostAction` 在 transaction 內查 `WeChatImport`：userId 必須等於目前 user、status READY、editorDraft 存在、尚無 post；然後 create Post 與 sourceImportId。若使用者編輯內容，保存編輯後 form 值，不重新從 editorDraft 覆蓋。

- [ ] **Step 5: 重跑 tests**

Run: `npm test -- src/components/admin/post-editor.test.tsx src/components/admin/wechat-import-workbench.test.tsx 'src/app/(backoffice)/admin/posts/actions.test.ts' src/lib/content/repository.test.ts src/components/site/article-body.test.tsx`

Expected: PASS；公開 article body 不含來源註記。

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/post-editor.tsx src/components/admin/post-editor.test.tsx src/components/admin/wechat-import-workbench.tsx src/components/admin/wechat-import-workbench.test.tsx 'src/app/(backoffice)/admin/posts/actions.ts' 'src/app/(backoffice)/admin/posts/actions.test.ts' src/lib/content/repository.ts src/lib/content/repository.test.ts
git commit -m "feat: hand WeChat drafts to the post editor"
```

### Task 14: 納入 Worker registry、監控與部署 Compose

**Files:**
- Create: `src/lib/workers/registry.ts`
- Create: `src/lib/workers/registry.test.ts`
- Create: `scripts/wechat-import-worker.ts`
- Create: `scripts/wechat-import-worker.test.ts`
- Modify: `src/app/(backoffice)/admin/worker/page.tsx`
- Create: `src/app/(backoffice)/admin/worker/page.test.tsx`
- Modify: `src/app/(backoffice)/admin/worker/actions.ts`
- Create: `src/app/(backoffice)/admin/worker/actions.test.ts`
- Modify: `package.json`
- Modify: `docker-compose.vm.yml`
- Modify: `docker-compose.coolify.yml`

**Interfaces:**
- Produces: `workerRegistry` entries for image、search-engine、wechat-import with ID/name/health thresholds。
- Produces: npm command `worker:wechat-imports`。
- Consumes: `processNextWeChatImport`、`recoverWeChatImportJobs`。

- [ ] **Step 1: 寫 registry、control、heartbeat、metrics failing tests**

測試不再以 ternary 只識別兩種 workers；未知 worker 拒絕；wechat start/stop/restart requested；restart runner 先原子改回 RUNNING 再 graceful exit；STOPPED 不 claim；SIGTERM 不在外部 call 中途硬切 transaction。Page 顯示各階段 counts、最近 20 筆、fetch method、圖片進度、模型、錯誤碼與合法 retry。

```ts
expect(workerRegistry["wechat-import"]).toMatchObject({ id: "wechat-import-worker", name: "WeChat import worker" });
expect(screen.getByRole("heading", { name: "微信文章匯入 Worker" })).toBeInTheDocument();
expect(screen.getByText("等待擷取")).toBeInTheDocument();
```

- [ ] **Step 2: 執行 targeted tests 並確認 fail**

Run: `npm test -- src/lib/workers/registry.test.ts scripts/wechat-import-worker.test.ts 'src/app/(backoffice)/admin/worker/page.test.tsx' 'src/app/(backoffice)/admin/worker/actions.test.ts'`

Expected: FAIL，registry／runner／UI 尚不存在。

- [ ] **Step 3: 實作 registry 與 generic control action**

`controlWorkerAction` 由 form `worker` lookup registry，OWNER 驗證沿用 `assertOwner`。`start` 寫 RUNNING、`stop` 寫 STOPPED；wechat 的 `restart` 寫 `RESTART_REQUESTED`。既有 image/search 的 restart 仍維持目前「清除錯誤並設為 RUNNING」行為，不把它們寫成尚未支援的 restart signal；registry 以 `supportsRestartSignal` 明確區別。

- [ ] **Step 4: 實作 runner 與管理頁**

Runner 每 2 秒 heartbeat/claim，無工作 delay 2 秒，錯誤 delay 5 秒；`--once` 完成一次 loop 後退出。為受控 E2E 提供 `--fixture-dir <absolute-path>` dependency adapter，但只有 `NODE_ENV === "test"` 時接受；production 收到此參數必須立即 exit 1。Fixture adapter 仍執行 parser、normalize、rewrite invariant、repository 與 transfer state machine，只替換外部微信／LLM／R2 I/O。管理頁把微信 panel 與任務表分開分頁 query，不讓既有 AI image pagination 參數衝突；使用 `wechatPage` query parameter。

- [ ] **Step 5: 新增 Compose services 並驗證解析**

兩份 Compose 使用 `build.target: wechat-worker-runtime`、相同 DB／LLM／R2 env file、`WECHAT_CHROMIUM_PATH=/usr/bin/chromium`、`restart: unless-stopped`。Run:

`docker compose -f docker-compose.vm.yml config >/dev/null && docker compose -f docker-compose.coolify.yml config >/dev/null`

Expected: 兩個 command exit 0，services 皆含 `wechat-import-worker`。

- [ ] **Step 6: 重跑 tests**

Run: `npm test -- src/lib/workers/registry.test.ts scripts/wechat-import-worker.test.ts 'src/app/(backoffice)/admin/worker/page.test.tsx' 'src/app/(backoffice)/admin/worker/actions.test.ts'`

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/lib/workers scripts/wechat-import-worker.ts scripts/wechat-import-worker.test.ts 'src/app/(backoffice)/admin/worker' package.json docker-compose.vm.yml docker-compose.coolify.yml
git commit -m "feat: monitor the WeChat import worker"
```

### Task 15: 加入 24 小時清理、E2E、操作文件與完整驗證

**Files:**
- Create: `src/lib/wechat-import/cleanup.ts`
- Create: `src/lib/wechat-import/cleanup.test.ts`
- Modify: `src/lib/retention/settings.ts`
- Modify: `src/lib/retention/settings.test.ts`
- Modify: `src/lib/retention/cleanup.ts`
- Modify: `src/lib/retention/cleanup.test.ts`
- Create: `tests/e2e/wechat-import.spec.ts`
- Modify: `README.md`
- Create: `docs/wechat-public-account-rewrite.md`
- Create: `docs/wechat-import-smoke.summary.json`
- Modify: `docs/test-log.md`
- Modify: `docs/project-status.md`

**Interfaces:**
- Produces: `expireWeChatImports(client, now): Promise<{ expired: number; payloadsCleared: number; failures: number }>`。
- Extends: `CleanupSummary` with `weChatImportPayloadsCleared`; existing `totalDeleted` remains the count of deleted database rows and does not misreport payload clearing as row deletion。
- Produces: reproducible E2E and documented live smoke command/result contract。

- [ ] **Step 1: 寫 retention failing tests**

測試 expiresAt 等於／早於 now、active lease 不清、READY without Post 保持 READY 且大型重複 payload 已由 transfer 階段清除、Post-linked provenance 保留、asset bytes 清空、URL query 去敏、ABANDONED/FAILED/UNKNOWN 轉 EXPIRED、cleanup summary counts。

```ts
expect(DEFAULT_RETENTION_SETTINGS.weChatImportHours).toBe(24);
expect(expired).toMatchObject({ status: "EXPIRED", sourceContentHtml: null, sourceBlocks: null, rewrittenDraft: null, editorDraft: null });
expect(expired.assets.every(asset => asset.imageBytes === null)).toBe(true);
```

- [ ] **Step 2: 執行 cleanup tests 並確認 fail**

Run: `npm test -- src/lib/wechat-import/cleanup.test.ts src/lib/retention/settings.test.ts src/lib/retention/cleanup.test.ts`

Expected: FAIL，24 小時 settings／cleanup 尚未接入。

- [ ] **Step 3: 實作 payload cleanup 與既有 retention integration**

使用 transaction 分批處理 100 筆 expired IDs；只在 lease null／expired 時更新。不是 delete entire import；保留 ID、userId、source hostname/hash、timestamps、status/error/report 與 READY assets 的 R2 mapping。`sourceUrl`/`originalUrl` 去除 query 和 fragment後保存，不保留可能含 token 的完整參數。

- [ ] **Step 4: 重跑 cleanup tests**

Run: `npm test -- src/lib/wechat-import/cleanup.test.ts src/lib/retention/settings.test.ts src/lib/retention/cleanup.test.ts`

Expected: PASS。

- [ ] **Step 5: 建立受控 E2E fixture workflow**

E2E 以 `NODE_ENV=test npm run worker:wechat-imports -- --fixture-dir <fixture-dir>` 啟動受控 worker adapter，測：入口 → URL → HTTP 預覽；另一用例的 fixture 明確標記 HTTP incomplete 並由 fake browser adapter回傳完整 DOM；改寫 FAITHFUL；確認 transfer；R2 URLs；進入 editor；保存 draft。另測 verification page 顯示穩定錯誤且沒有 browser bypass。再新增 runner test，證明 `NODE_ENV=production` 搭配 `--fixture-dir` 會 exit 1，避免測試後門進入部署環境。

Run: `npm run test:e2e -- tests/e2e/wechat-import.spec.ts`

Expected: PASS；不連線真實微信、LLM 或 R2。

- [ ] **Step 6: 更新文件與建立尚未執行的 smoke artifact**

所有文件標記 `最後更新：2026-09-07`。`docs/wechat-import-smoke.summary.json` 初始內容必須誠實標示未執行：

```json
{
  "generated_at": "2026-09-07T00:00:00+08:00",
  "summary": {
    "status": "not_run",
    "reason": "尚未在有權使用的公開微信文章、真實 LLM 與 Cloudflare R2 環境執行"
  },
  "success": [],
  "failure": []
}
```

操作文件列出 `npm run worker:wechat-imports -- --once`、受控 E2E、正式 smoke 前置環境變數、Worker 管理判讀、錯誤碼、重試與 24 小時清理；不得把 mock E2E 寫成真實整合完成。

- [ ] **Step 7: 執行完整自動驗證**

Run: `npm test`

Expected: 所有 Vitest suites PASS，0 failures。

Run: `npx tsc --noEmit`

Expected: exit 0。

Run: `npm run lint`

Expected: exit 0，0 lint errors。

Run: `npm run build`

Expected: Prisma generate 與 Next.js production build exit 0。

Run: `npm run test:e2e -- tests/e2e/wechat-import.spec.ts`

Expected: 微信受控 E2E 全部 PASS。

Run: `docker compose -f docker-compose.vm.yml config >/dev/null && docker compose -f docker-compose.coolify.yml config >/dev/null`

Expected: exit 0。

- [ ] **Step 8: 檢查 spec coverage 與工作樹**

Run: `rg -n "公開|Chromium|FAITHFUL|DEEP_SEO|UNKNOWN|R2|sourceImportId|24 小時|summary|success|failure|Worker" docs/wechat-public-account-rewrite.md docs/test-log.md docs/project-status.md docs/wechat-import-smoke.summary.json`

Expected: 每項需求在操作、測試或狀態文件至少有一個明確命中。

Run: `git status --short && git diff --check`

Expected: 只有本 task 預期文件／測試變更以及使用者原有 `next-env.d.ts`；diff check 無 whitespace error。

- [ ] **Step 9: Commit**

```bash
git add src/lib/wechat-import/cleanup.ts src/lib/wechat-import/cleanup.test.ts src/lib/retention/settings.ts src/lib/retention/settings.test.ts src/lib/retention/cleanup.ts src/lib/retention/cleanup.test.ts tests/e2e/wechat-import.spec.ts README.md docs/wechat-public-account-rewrite.md docs/wechat-import-smoke.summary.json docs/test-log.md docs/project-status.md
git commit -m "test: verify WeChat article rewrite workflow"
```

---

## Live smoke gate（需真實外部環境，不能由 mock 取代）

在部署 migration、啟動 `wechat-import-worker`、設定真實 LLM 與 R2 後，由有權使用來源內容的管理員提供一篇公開文章，執行完整流程。驗收者必須記錄：

- 正規化 URL 的去敏識別與執行時間。
- HTTP 或 Chromium fetch method。
- 原頁標題、正文 block 數、預期／成功／失敗圖片數。
- 改寫模式、目標語言、圖片 invariant。
- LLM provider/model、usage record ID、token 與估算費用。
- R2 object 數與 editor draft 圖片 URL 數。
- 草稿保存結果；不得在 smoke 自動發布。
- `docs/wechat-import-smoke.summary.json` 的 `generated_at`、`summary`、`success`、`failure`。

正式 smoke 若任何圖片缺失、正文疑似截斷、LLM image invariant 不符或 R2 URL 未完整替換，整體狀態必須記為 `failure` 或 `partial`，不得只因 Post 草稿已建立而標示成功。
