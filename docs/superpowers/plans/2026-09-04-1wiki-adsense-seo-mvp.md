# 1Wiki AdSense SEO 科技教學站 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可部署至 Vercel 的繁體中文科技教學站，包含帳密後台、文章與分類管理、DeepSeek/OpenAI/Gemini 草稿生成、完整公開 SEO，以及預設關閉的手動 AdSense placements。

**Architecture:** 單一 Next.js App Router 應用以 Server Components 輸出公開內容，管理區透過 server actions 操作 PostgreSQL/Prisma。身份系統使用 Argon2id、資料庫 session 與 OWNER/EDITOR 權限；AI、文章清理、SEO 與廣告配置各自封裝成獨立模組。

**Tech Stack:** Node.js 22、Next.js 16.3.4、React 19.2.8、TypeScript 6.0.3、Tailwind CSS 4.3.3、PostgreSQL 17、Prisma 7.10.0、Argon2id、Zod 4.5.4、sanitize-html 2.17.7、Cheerio 1.2.0、Vitest 5.0.0、Playwright 1.62.1

**Spec:** `docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md`

## Global Constraints

- 品牌固定為「1Wiki｜AI、軟體、3C 使用教學與疑難解答」，預設語言為 `zh-Hant-TW`。
- 正式網址只由 `NEXT_PUBLIC_SITE_URL` 決定，不得寫死部署網域。
- 正式 repository 是 `applet0421/1wiki`；`SamurAIGPT/blogger-cms` 僅作為 MIT 授權的 upstream 與選擇性移植來源。
- 移除 Stripe、Credits、Pricing、Subscription、MuAPI、Google OAuth、使用者自帶 API key 與無關影像資料模型。
- 不加入 Keyword Agent、Flowise、Search Console API、多語系、會員付費、公開註冊、忘記密碼郵件或複雜 Dashboard。
- LLM provider 支援 `deepseek`、`openai`、`gemini`，預設 `deepseek`；金鑰只存在 server-side 環境變數，不自動 fallback。
- 文章 HTML 不得儲存 `<script>`、AdSense `<ins>`、event handler、iframe 或危險 URL。
- AdSense 採手動 slot，Auto ads 預設關閉；`feed_inline` 僅保留設定，MVP 不渲染。
- Production 在 AdSense 未啟用或缺少設定時，不載入 script、不建立廣告節點、不保留空白。
- 所有管理能力在伺服器端驗證 session、帳號啟用狀態與 OWNER/EDITOR 權限。
- 文件變更必須保留 `最後更新：YYYY-MM-DD`。

---

### Task 1: 建立安全、可測試的 Next.js 基線

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `LICENSE.upstream`
- Create: `README.md`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/lib/config/site.ts`
- Test: `src/lib/config/site.test.ts`

**Interfaces:**
- Consumes: approved design spec and upstream MIT license text.
- Produces: `siteConfig`, `getSiteUrl()` and a compiling Next.js/Test/Playwright baseline used by every later task.

- [ ] **Step 1: Record upstream and scaffold dependencies**

Add `https://github.com/SamurAIGPT/blogger-cms.git` as the `upstream` remote without changing `origin`. Create `package.json` with exact runtime versions from the header, scripts `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `test:e2e`, `prisma:generate`, `db:migrate`, `db:seed`, and `bootstrap:owner`. Include `@prisma/client`, `pg`, `argon2`, `zod`, `sanitize-html`, `cheerio`, `lucide-react`; include Prisma, Vitest, Testing Library, jsdom, ESLint, Playwright, TypeScript and Tailwind as development dependencies. Run `npm install` to produce the lockfile.

- [ ] **Step 2: Write the failing site configuration test**

```ts
import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl, siteConfig } from "./site";

describe("site configuration", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => { process.env.NEXT_PUBLIC_SITE_URL = original; });

  it("normalizes the configured site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://1wiki.example/";
    expect(getSiteUrl()).toBe("https://1wiki.example");
  });

  it("uses the approved Traditional Chinese identity", () => {
    expect(siteConfig.name).toBe("1Wiki｜AI、軟體、3C 使用教學與疑難解答");
    expect(siteConfig.locale).toBe("zh-Hant-TW");
  });
});
```

- [ ] **Step 3: Run the test and verify the RED state**

Run: `npm test -- src/lib/config/site.test.ts`

Expected: FAIL because `src/lib/config/site.ts` does not exist.

- [ ] **Step 4: Implement the minimal site shell**

Create `siteConfig` and `getSiteUrl()`; configure the root layout with `lang="zh-Hant-TW"`, viewport metadata, global styles, and a temporary semantic home page. Copy only upstream ideas needed for typography and editor styling, not SaaS navigation or billing. Add upstream attribution and full MIT text to `LICENSE.upstream` and README.

`.env.example` must list safe empty/default values for database, auth, owner bootstrap, all three LLMs, contact information, and every AdSense variable from the spec; it must contain no usable secret.

- [ ] **Step 5: Verify the GREEN state and baseline build**

Run: `npm test -- src/lib/config/site.test.ts && npm run lint && npm run build`

Expected: 2 tests pass, lint exits 0, build exits 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts .gitignore .env.example LICENSE.upstream README.md src
git commit -m "chore: establish 1Wiki application baseline"
```

### Task 2: 建立內容領域驗證、slug 與 HTML 安全邊界

**Files:**
- Create: `src/lib/content/schema.ts`
- Create: `src/lib/content/slug.ts`
- Create: `src/lib/content/sanitize.ts`
- Create: `src/lib/content/article-segments.ts`
- Test: `src/lib/content/slug.test.ts`
- Test: `src/lib/content/sanitize.test.ts`
- Test: `src/lib/content/article-segments.test.ts`

**Interfaces:**
- Consumes: no database or UI dependency.
- Produces: `postInputSchema`, `categoryInputSchema`, `slugifyTitle(title)`, `sanitizeArticleHtml(html)`, and `segmentArticle(html)` returning `{ introHtml, bodySegments, midAdAfterIndex, visibleCharacterCount }`.

- [ ] **Step 1: Write failing slug and sanitizer tests**

```ts
expect(slugifyTitle("ChatGPT 無法登入？完整解法")).toBe("chatgpt-無法登入-完整解法");
expect(sanitizeArticleHtml('<p onclick="steal()">安全</p><script>alert(1)</script>'))
  .toBe("<p>安全</p>");
expect(sanitizeArticleHtml('<ins class="adsbygoogle">ad</ins>')).toBe("");
expect(sanitizeArticleHtml('<a href="javascript:alert(1)">連結</a>')).toBe("<a>連結</a>");
```

- [ ] **Step 2: Run tests and verify the RED state**

Run: `npm test -- src/lib/content/slug.test.ts src/lib/content/sanitize.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement slug, Zod schemas and allowlist sanitation**

Allow only `p`, `h2`, `h3`, `strong`, `em`, `u`, `a`, `ul`, `ol`, `li`, `blockquote`, `code`, `pre`, `br`, `img`; allow `href`, `title`, `target`, `rel` on links and `src`, `alt`, `width`, `height` on images. Permit only `https`, `http`, and `mailto` links, force external links to safe `rel`, and remove all `script`, `style`, `iframe`, `ins`, `on*` attributes and data URLs.

- [ ] **Step 4: Write the failing article segmentation tests**

Test three behaviors with generated paragraphs: intro ends before the first H2; a 1,199-character article has `midAdAfterIndex: null`; a 1,200+ character article with at least two H2 sections selects the section boundary whose cumulative visible text is closest to 45%.

- [ ] **Step 5: Run segmentation tests and verify the RED state**

Run: `npm test -- src/lib/content/article-segments.test.ts`

Expected: FAIL because `segmentArticle` does not exist.

- [ ] **Step 6: Implement deterministic segmentation**

Use Cheerio in server-only code. Treat top-level content before the first H2 as the intro; group each H2 with following nodes until the next H2. Count Unicode-visible characters after stripping tags and whitespace. For 1,200+ visible characters with two or more H2 groups, choose the completed group nearest 45%, never after the final group. Return HTML fragments without inserting AdSense markup.

- [ ] **Step 7: Verify all content tests and commit**

Run: `npm test -- src/lib/content`

Expected: all content tests pass.

```bash
git add src/lib/content
git commit -m "feat: add safe article content pipeline"
```

### Task 3: 建立 Prisma 資料模型、分類 seed 與 OWNER 初始化

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `prisma/seed.ts`
- Create: `scripts/bootstrap-owner.ts`
- Create: `src/lib/db/prisma.ts`
- Create: `src/lib/auth/password.ts`
- Test: `src/lib/auth/password.test.ts`
- Test: `tests/integration/bootstrap-owner.test.ts`
- Create: `docker-compose.test.yml`

**Interfaces:**
- Consumes: `DATABASE_URL`, `DIRECT_URL`, `INITIAL_OWNER_USERNAME`, `INITIAL_OWNER_PASSWORD`, `INITIAL_OWNER_DISPLAY_NAME`.
- Produces: Prisma models `User`, `Session`, `Category`, `Post`; enums `UserRole`, `PostStatus`; `hashPassword()`, `verifyPassword()`; idempotent category seed; guarded owner bootstrap command.

- [ ] **Step 1: Write the failing password tests**

```ts
it("stores an Argon2id hash and verifies the original password", async () => {
  const hash = await hashPassword("secure-owner-2026");
  expect(hash).toMatch(/^\$argon2id\$/);
  expect(await verifyPassword(hash, "secure-owner-2026")).toBe(true);
  expect(await verifyPassword(hash, "wrong-password-2026")).toBe(false);
});
```

- [ ] **Step 2: Verify RED, then implement the password module**

Run: `npm test -- src/lib/auth/password.test.ts`

Expected: FAIL because the module does not exist. Implement Argon2id hashing with explicit memory, time and parallelism parameters, then rerun and expect PASS.

- [ ] **Step 3: Define the Prisma schema and migration**

Implement every field in spec sections 4.1–4.4. Store only `Session.tokenHash` with a unique index and relation to `User`; add indexes for `Post(status, publishedAt)`, `Post(categoryId, status)`, and `Session(expiresAt)`. Add `mustChangePassword`, lockout fields and cascading session deletion. Generate and inspect the initial SQL migration.

- [ ] **Step 4: Write failing database integration tests**

Start the isolated PostgreSQL service with `docker compose -f docker-compose.test.yml up -d`, migrate it, then test that seed produces exactly `ai`, `software`, `social`; bootstrap creates one OWNER; a second bootstrap refuses without changing its password hash; a weak password and missing environment value are rejected.

- [ ] **Step 5: Implement seed and guarded bootstrap**

Normalize usernames to lowercase, require at least 12 characters with letters and digits, wrap the “no OWNER then create” operation in a serializable transaction, and never log the supplied password. Exit non-zero with a safe message when an OWNER already exists.

- [ ] **Step 6: Verify schema, integration tests and commit**

Run: `npm run prisma:generate && npm test -- src/lib/auth/password.test.ts tests/integration/bootstrap-owner.test.ts`

Expected: Prisma generation succeeds and all tests pass.

```bash
git add prisma prisma.config.ts scripts src/lib/db src/lib/auth/password.ts src/lib/auth/password.test.ts tests/integration docker-compose.test.yml package.json package-lock.json
git commit -m "feat: add content database and owner bootstrap"
```

### Task 4: 實作帳密登入、資料庫 Session 與角色授權

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/authorize.ts`
- Create: `src/lib/auth/login.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/actions.ts`
- Create: `src/app/(auth)/change-password/page.tsx`
- Create: `src/app/(auth)/change-password/actions.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/users/actions.ts`
- Create: `src/components/admin/user-form.tsx`
- Test: `src/lib/auth/login.test.ts`
- Test: `src/lib/auth/authorize.test.ts`
- Test: `src/app/admin/users/actions.test.ts`

**Interfaces:**
- Consumes: Prisma `User`/`Session`, `hashPassword()`, `verifyPassword()`, `AUTH_SESSION_SECRET`.
- Produces: `login(username, password)`, `createSession(userId)`, `getCurrentUser()`, `requireUser()`, `requireOwner()`, `logout()`, and OWNER-only user actions.

- [ ] **Step 1: Write failing login/session tests**

Cover successful login, unknown username and wrong password sharing the same public error, failure counter increments, fifth failure locks for 15 minutes, success clears counters, inactive users fail, session stores only a SHA-256/HMAC token hash, and expired sessions fail.

- [ ] **Step 2: Run auth tests and verify the RED state**

Run: `npm test -- src/lib/auth/login.test.ts src/lib/auth/authorize.test.ts`

Expected: FAIL because auth services do not exist.

- [ ] **Step 3: Implement login and database sessions**

Use `crypto.randomBytes(32)` for the cookie token and an HMAC-SHA-256 keyed by `AUTH_SESSION_SECRET` for `tokenHash`. Set `HttpOnly`, `SameSite=Lax`, `Path=/`, seven-day expiry, and `Secure` only in production. Recheck `isActive` on every protected request. Redirect `mustChangePassword` users to `/change-password` from every admin route except logout and password change.

- [ ] **Step 4: Write failing role and account-management tests**

Verify EDITOR cannot list or mutate users; new accounts default to EDITOR; username uniqueness is case-insensitive; reset sets a temporary password, `mustChangePassword=true`, and deletes sessions; inactive users lose sessions; and the last active OWNER cannot be deleted, disabled or demoted.

- [ ] **Step 5: Implement login pages and OWNER user management**

Use server actions for login, logout, password change, create, reset, role update and activation update. Return field-safe Traditional Chinese errors. Never send `passwordHash`, lockout internals or session records to Client Components.

- [ ] **Step 6: Verify auth tests and commit**

Run: `npm test -- src/lib/auth src/app/admin/users`

Expected: all auth and user-management tests pass.

```bash
git add src/lib/auth src/app/'(auth)' src/app/admin/layout.tsx src/app/admin/users src/components/admin
git commit -m "feat: add managed admin authentication"
```

### Task 5: 實作文章、分類與 Rich Text 管理介面

**Files:**
- Create: `src/lib/content/repository.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/actions.ts`
- Create: `src/app/admin/posts/new/page.tsx`
- Create: `src/app/admin/posts/[id]/page.tsx`
- Create: `src/app/admin/posts/actions.ts`
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/app/admin/categories/actions.ts`
- Create: `src/components/admin/admin-nav.tsx`
- Create: `src/components/admin/post-editor.tsx`
- Create: `src/components/admin/rich-text-editor.tsx`
- Create: `src/components/admin/seo-fields.tsx`
- Test: `src/app/admin/posts/actions.test.ts`
- Test: `src/app/admin/categories/actions.test.ts`

**Interfaces:**
- Consumes: content schemas/sanitizer, Prisma models, `requireUser()`.
- Produces: repository reads and authenticated server actions `savePost`, `deletePost`, `setPostStatus`, `createCategory`, `updateCategory`, `deleteCategory`.

- [ ] **Step 1: Write failing CRUD and publication tests**

Verify unauthenticated writes fail; OWNER and EDITOR can write; HTML is sanitized before persistence; duplicate slug returns a Traditional Chinese field error; publishing without title, slug, category, excerpt or body fails; first publish sets `publishedAt`; unpublishing preserves it; deletion requires explicit post id.

- [ ] **Step 2: Run tests and verify the RED state**

Run: `npm test -- src/app/admin/posts/actions.test.ts src/app/admin/categories/actions.test.ts`

Expected: FAIL because actions do not exist.

- [ ] **Step 3: Implement repositories and server actions**

Keep public repository functions separate from admin queries. Convert Prisma unique errors to stable field errors. Prevent deletion of a category that still owns posts and protect the three initial category slugs from accidental deletion.

- [ ] **Step 4: Port and constrain the upstream editor**

Port the useful contentEditable formatting behavior from upstream into TypeScript, keep only paragraph/H2/H3/bold/italic/underline/link/lists, add accessible toolbar labels, and bind its HTML to the post form. Do not port upstream billing, credits, pricing, API key modal, gallery naming, global overflow lock or SaaS navigation.

- [ ] **Step 5: Build the compact admin UI**

Create responsive post list with draft/published status, category filters and edit links; a post form with slug, excerpt, cover image, SEO fields, save draft and publish actions; category management; and nav visibility based on role. Display confirmation before destructive actions.

- [ ] **Step 6: Verify CRUD tests, lint and commit**

Run: `npm test -- src/app/admin && npm run lint`

Expected: all admin tests pass and lint exits 0.

```bash
git add src/lib/content/repository.ts src/app/admin src/components/admin
git commit -m "feat: add article and category administration"
```

### Task 6: 實作 DeepSeek、OpenAI、Gemini 文章生成 adapters

**Files:**
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/schema.ts`
- Create: `src/lib/ai/config.ts`
- Create: `src/lib/ai/errors.ts`
- Create: `src/lib/ai/prompt.ts`
- Create: `src/lib/ai/providers/deepseek.ts`
- Create: `src/lib/ai/providers/openai.ts`
- Create: `src/lib/ai/providers/gemini.ts`
- Create: `src/lib/ai/generate-article.ts`
- Create: `src/app/admin/posts/generate-actions.ts`
- Test: `src/lib/ai/config.test.ts`
- Test: `src/lib/ai/generate-article.test.ts`
- Test: `src/lib/ai/providers/providers.test.ts`

**Interfaces:**
- Consumes: `LLM_PROVIDER`, provider-specific key/model variables, topic, primary keyword and optional instructions.
- Produces: `generateArticle(input): Promise<GeneratedArticle>` with normalized title, contentHtml, excerpt and SEO fields; `AIProviderError` with safe category/message.

- [ ] **Step 1: Write failing provider selection and validation tests**

Verify absent `LLM_PROVIDER` selects DeepSeek; only the selected provider needs a key/model; unsupported values fail before network access; and no returned error contains any API key.

- [ ] **Step 2: Run tests and verify the RED state**

Run: `npm test -- src/lib/ai/config.test.ts`

Expected: FAIL because AI config does not exist.

- [ ] **Step 3: Implement provider configuration and shared schema**

Define one Zod schema requiring non-empty title/content/excerpt/SEO fields. Centralize a Traditional Chinese technology-help prompt that instructs the model to produce valid, helpful HTML without scripts, ads, fabricated personal experience or markdown fences.

- [ ] **Step 4: Write failing adapter contract tests**

Inject a local `fetch` stub into each adapter. Assert DeepSeek sends `response_format: { type: "json_object" }` to `/chat/completions`; OpenAI sends a JSON schema response format to `/responses`; Gemini sends `application/json` plus schema to its generate endpoint. Assert 401, 429, timeout, 5xx, malformed JSON and schema-invalid output become the correct safe error category.

- [ ] **Step 5: Implement three adapters and orchestration**

Use native `fetch` and `AbortSignal.timeout(60_000)` so no provider SDK leaks into UI code. Do not retry or cross-provider fallback in MVP. Parse the selected provider, validate the shared result, run `sanitizeArticleHtml`, and return data without writing to Prisma.

- [ ] **Step 6: Connect AI generation to the editor**

Create an authenticated server action available to OWNER and EDITOR. The editor applies generated fields only after a successful response; on failure it retains every existing field and shows the safe Traditional Chinese message. Display the active provider name, never its model key.

- [ ] **Step 7: Verify AI tests and commit**

Run: `npm test -- src/lib/ai src/app/admin/posts/generate-actions.test.ts`

Expected: all provider, orchestration and action tests pass.

```bash
git add src/lib/ai src/app/admin/posts src/components/admin/post-editor.tsx
git commit -m "feat: add configurable AI article generation"
```

### Task 7: 建立公開首頁、分類、文章與完整 SEO

**Files:**
- Create: `src/lib/seo/metadata.ts`
- Create: `src/lib/seo/structured-data.ts`
- Create: `src/components/site/header.tsx`
- Create: `src/components/site/footer.tsx`
- Create: `src/components/site/article-card.tsx`
- Create: `src/components/site/breadcrumbs.tsx`
- Create: `src/components/site/json-ld.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/ai/page.tsx`
- Create: `src/app/software/page.tsx`
- Create: `src/app/social/page.tsx`
- Create: `src/app/category/[slug]/page.tsx`
- Create: `src/app/articles/[slug]/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/manifest.ts`
- Test: `src/lib/seo/metadata.test.ts`
- Test: `src/lib/seo/structured-data.test.ts`
- Test: `src/app/sitemap.test.ts`

**Interfaces:**
- Consumes: public content repository and `siteConfig`.
- Produces: public pages, `buildPostMetadata(post)`, `buildArticleJsonLd(post)`, `buildWebsiteJsonLd()`, sitemap, robots and manifest.

- [ ] **Step 1: Write failing SEO tests**

Verify custom canonical wins, fallback canonical is `${siteUrl}/articles/${slug}`, draft content produces no public result, Article JSON-LD includes headline/author/datePublished/dateModified, and sitemap contains only published articles and public routes.

- [ ] **Step 2: Run tests and verify the RED state**

Run: `npm test -- src/lib/seo src/app/sitemap.test.ts`

Expected: FAIL because SEO helpers do not exist.

- [ ] **Step 3: Implement metadata and structured data helpers**

Return serializable objects with no raw secret or unpublished field. Use a single default OG image when `coverImage` is empty. Root layout emits Website and Organization data; article page emits Article data and exactly one H1.

- [ ] **Step 4: Build public navigation and listing pages**

Implement a shared responsive header/footer, category cards, latest/featured article sections, `/ai`, `/software`, `/social`, and generic category pages. Every list query filters `PUBLISHED`. Use semantic landmarks, visible focus styles, 44px touch targets and meaningful empty states.

- [ ] **Step 5: Build article page and error states**

Render sanitized content with breadcrumbs, category, author, published/updated times and related category links. Use `notFound()` for missing, draft or invalid slugs. Keep mobile body text at least 18px/1.7 line-height and desktop content column at most 760px.

- [ ] **Step 6: Verify SEO tests, build and commit**

Run: `npm test -- src/lib/seo src/app/sitemap.test.ts && npm run build`

Expected: tests pass and all public/admin routes compile.

```bash
git add src/lib/seo src/components/site src/app
git commit -m "feat: add public site and search metadata"
```

### Task 8: 實作手動 AdSense placements 與 ads.txt

**Files:**
- Create: `src/lib/adsense/config.ts`
- Create: `src/lib/adsense/eligibility.ts`
- Create: `src/components/ads/ad-slot.tsx`
- Create: `src/components/ads/adsense-script.tsx`
- Create: `src/components/site/article-body.tsx`
- Modify: `src/app/articles/[slug]/page.tsx`
- Create: `src/app/ads.txt/route.ts`
- Test: `src/lib/adsense/config.test.ts`
- Test: `src/components/ads/ad-slot.test.tsx`
- Test: `src/components/site/article-body.test.tsx`
- Test: `src/app/ads.txt/route.test.ts`

**Interfaces:**
- Consumes: `segmentArticle()`, article publication state and all AdSense environment variables.
- Produces: `AdPlacement`, `getAdSlotConfig(placement)`, `isAdsenseEnabled()`, `<AdSlot placement />`, `<AdsenseScript />`, `<ArticleBody />`, and dynamic `/ads.txt`.

- [ ] **Step 1: Write failing configuration and route-exclusion tests**

Verify ads require enabled flag, client ID, placement ID and an allowed published article route; false/missing values return no config; `feed_inline` is always disabled in MVP; admin, login, policy, 404, error and draft contexts are denied.

- [ ] **Step 2: Run tests and verify the RED state**

Run: `npm test -- src/lib/adsense/config.test.ts`

Expected: FAIL because AdSense config does not exist.

- [ ] **Step 3: Implement central placement configuration**

Map all five placement names to environment variables in one module. Keep slot IDs out of pages and stored HTML. Production returns `null` when incomplete; development can return preview metadata labelled `AdSense · placement` without loading Google code.

- [ ] **Step 4: Write failing component and insertion tests**

Verify a disabled/missing production slot renders no node; the Google script is emitted once; each mounted slot initializes once even after rerender; initialization failure is caught; article output places after-intro, optional mid and end slots in order; 1,199 visible characters omit mid; desktop sidebar has `hidden lg:block`; no article has more than three body slots.

- [ ] **Step 5: Implement script, slots and article renderer**

Use Next `<Script strategy="afterInteractive">` once per eligible article page. `AdSlot` renders responsive `<ins className="adsbygoogle">` only with a complete config, guards initialization with a ref and existing `data-ad-status`, and catches `push` errors. Use `width:100%`, centered layout, mobile/desktop minimum heights from the spec, with no `max-height` or `overflow:hidden`.

- [ ] **Step 6: Implement `/ads.txt` and publisher metadata**

With a valid `ADSENSE_PUBLISHER_ID` matching `pub-[0-9]+`, return `text/plain` containing `google.com, {id}, DIRECT, f08c47fec0942fa0`. Without a valid ID, return an empty 404 response. Add `google-adsense-account` metadata only to eligible article pages when AdSense is enabled and IDs are valid.

- [ ] **Step 7: Verify AdSense tests and commit**

Run: `npm test -- src/lib/adsense src/components/ads src/components/site/article-body.test.tsx src/app/ads.txt/route.test.ts`

Expected: all AdSense acceptance tests pass.

```bash
git add src/lib/adsense src/components/ads src/components/site/article-body.tsx src/app/articles src/app/ads.txt
git commit -m "feat: add controlled AdSense placements"
```

### Task 9: 完成政策頁、端對端驗證、文件與安全稽核

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `tests/e2e/public-pages.spec.ts`
- Create: `tests/e2e/admin-auth.spec.ts`
- Create: `tests/e2e/adsense-disabled.spec.ts`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: complete application and a migrated/seeded test PostgreSQL database.
- Produces: policy pages, reproducible setup/deploy guide and final evidence for every acceptance criterion.

- [ ] **Step 1: Write failing public and authentication E2E tests**

Use a seeded published fixture and draft fixture. Test `/`, `/ai`, `/software`, `/social`, generic category, published article, four policy pages, 404, login redirect, OWNER login, EDITOR denial from `/admin/users`, and draft article 404.

- [ ] **Step 2: Write failing AdSense-disabled E2E tests**

Start the app with `NEXT_PUBLIC_ADSENSE_ENABLED=false`. At 360, 390, 768 and 1280px assert no `pagead2.googlesyndication.com` request, no `.adsbygoogle`, no `[data-ad-placement]`, no horizontal overflow, and no visible desktop sidebar below `lg`.

- [ ] **Step 3: Run E2E tests and verify the RED state**

Run: `npm run test:e2e`

Expected: FAIL until policy pages and fixtures are complete.

- [ ] **Step 4: Implement policy pages and finish responsive styles**

Write editable Traditional Chinese About, Contact, Privacy Policy and Terms drafts. Contact uses `NEXT_PUBLIC_CONTACT_EMAIL` when present and otherwise shows a neutral contact note. Clearly mark in README that the operator must review legal copy, configure consent/CMP and provide real identity/contact details before production monetization.

- [ ] **Step 5: Complete README and deployment instructions**

Document Node/PostgreSQL requirements, environment variables, local database, migrations, seed, one-time OWNER bootstrap and immediate secret removal, dev/test/build commands, provider switching, Vercel configuration, AdSense approval steps, `/ads.txt`, CMP, and upstream attribution. Include exact commands that a new maintainer can copy.

- [ ] **Step 6: Run the complete verification gate**

Run these commands fresh and retain their full outputs:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm audit --omit=dev --registry=https://registry.npmjs.org
git diff --check
```

Expected: unit/integration/E2E tests report zero failures, lint and build exit 0, production dependency audit reports zero known vulnerabilities, and diff check emits no errors.

- [ ] **Step 7: Inspect requirements line by line**

Compare the completed application to every item in spec sections 3–11. Verify removal with:

```bash
rg -n -i "stripe|credit|pricing|subscription|muapi|google oauth|customApiKey" src prisma package.json .env.example
```

Expected: no runtime implementation remains; documentation may mention removed upstream features only in clearly labelled migration context.

- [ ] **Step 8: Commit the final MVP verification work**

```bash
git add src/app/about src/app/contact src/app/privacy src/app/terms tests README.md .env.example
git commit -m "test: verify 1Wiki MVP release readiness"
```

The branch is ready for final review only after Step 6 is rerun after the final commit and remains fully green.
