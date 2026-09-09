# AdSense Anchor Overlay Implementation Plan

最後更新：2026-09-09

文件狀態：歷史實作計畫；現行文章／分類廣告規則見 [同分類文章連續閱讀](../../article-auto-loading.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OWNER-controlled, bottom-only AdSense Anchor ads to eligible public pages while retaining compliant manual in-page and desktop-sidebar placements.

**Architecture:** Extend the existing singleton `ArticleAdSetting` with the Anchor master switch and three page-type flags. Resolve these settings on the server and pass a single `data-overlays="bottom"` AdSense script through page-specific renderers; do not create custom fixed-position `<ins>` elements. Existing manual slots remain responsible for article, category, and feed placements, while the page-level script is emitted once per document.

**Tech Stack:** Next.js App Router 16.3, React, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, AdSense Auto ads.

**Spec:** `docs/superpowers/specs/2026-09-08-adsense-overlay-format-design.md`

## Global Constraints

- Use only the bottom Anchor format via `data-overlays="bottom"`; do not build custom fixed AdSense containers.
- Do not add a floating video unit, Vignette, third-party demand source, or a manually fixed 728×90/970×90 unit.
- Keep manual sticky placement limited to the existing <=300px `sidebar_desktop_sticky` unit at >=1280px.
- Anchor ads are page-level: at most one AdSense script/configuration may exist in a document, including an auto-loaded article continuation.
- Never initialize ads on admin, auth, policy, unpublished, or unsupported public routes.
- Preserve the existing fallback for a stale Prisma client: show defaults in reads and block OWNER writes with an actionable migration/restart message.

---

### Task 1: Persist Anchor-ad policy in `ArticleAdSetting`

**Files:**
- Modify: `prisma/schema.prisma:409-415`
- Create: `prisma/migrations/20260908010000_add_article_ad_anchor_settings/migration.sql`
- Modify: `src/lib/adsense/article-ad-settings.ts:1-39`
- Modify: `src/lib/adsense/article-ad-settings.test.ts:1-30`

**Interfaces:**
- Produces `ArticleAdSettings`:
  ```ts
  export type ArticleAdSettings = ArticleAdInsertionRules & {
    anchorAdsEnabled: boolean;
    anchorAdsOnArticles: boolean;
    anchorAdsOnHome: boolean;
    anchorAdsOnCategories: boolean;
  };
  ```
- Produces `DEFAULT_ARTICLE_AD_SETTINGS` with `anchorAdsEnabled: false` and all three page flags `true`.
- `getOrCreateArticleAdSettings(client)` returns `Promise<ArticleAdSettings>` and keeps the stale-client fallback.

- [ ] **Step 1: Write the failing repository tests**

  Add a test proving defaults include the master switch off and all three per-page defaults on:
  ```ts
  expect(DEFAULT_ARTICLE_AD_SETTINGS).toMatchObject({
    anchorAdsEnabled: false,
    anchorAdsOnArticles: true,
    anchorAdsOnHome: true,
    anchorAdsOnCategories: true,
  });
  ```
  Update the existing mocked `upsert` row to include the four fields and expect `getOrCreateArticleAdSettings` to return exactly these fields.

- [ ] **Step 2: Run the repository test to verify it fails**

  Run: `npm test -- src/lib/adsense/article-ad-settings.test.ts`

  Expected: FAIL because the default object and return type do not expose Anchor settings.

- [ ] **Step 3: Add the schema and migration**

  Add these fields to `ArticleAdSetting`:
  ```prisma
  anchorAdsEnabled      Boolean @default(false)
  anchorAdsOnArticles   Boolean @default(true)
  anchorAdsOnHome       Boolean @default(true)
  anchorAdsOnCategories Boolean @default(true)
  ```
  Create the migration with non-null defaults:
  ```sql
  ALTER TABLE "ArticleAdSetting"
    ADD COLUMN "anchorAdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "anchorAdsOnArticles" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "anchorAdsOnHome" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "anchorAdsOnCategories" BOOLEAN NOT NULL DEFAULT true;
  ```

- [ ] **Step 4: Extend the settings repository minimally**

  Replace the narrow return type with `ArticleAdSettings`; include the four fields in `DEFAULT_ARTICLE_AD_SETTINGS`, in the `upsert.create` payload, and when mapping a Prisma row to the returned object. Keep cadence validation limited to `middleAdInterval` and `maxMiddleAds`; booleans need no numeric validation.

- [ ] **Step 5: Run the repository test to verify it passes**

  Run: `npm test -- src/lib/adsense/article-ad-settings.test.ts`

  Expected: PASS, including the stale-client default fallback.

- [ ] **Step 6: Generate Prisma client and commit the isolated task**

  Run: `npx prisma generate`

  Commit only the task files when the shared worktree is clean enough to do so:
  ```bash
  git add prisma/schema.prisma prisma/migrations/20260908010000_add_article_ad_anchor_settings/migration.sql src/lib/adsense/article-ad-settings.ts src/lib/adsense/article-ad-settings.test.ts
  git commit -m "feat: persist AdSense anchor settings"
  ```

### Task 2: Derive a page-level, bottom-only Anchor configuration

**Files:**
- Modify: `src/lib/adsense/config.ts:1-52`
- Modify: `src/lib/adsense/config.test.ts`
- Modify: `src/components/ads/adsense-script.tsx:1-2`
- Create: `src/components/ads/adsense-script.test.tsx`

**Interfaces:**
- Consumes `ArticleAdSettings` from Task 1.
- Produces:
  ```ts
  export type PublicAdPage = "article" | "home" | "category";
  export function getAnchorAdsConfig(
    settings: ArticleAdSettings,
    env: AdEnvironment,
    pathname: string,
  ): { clientId: string; overlays: "bottom" } | null;
  ```
- `AdsenseScript` accepts `overlays?: "bottom"` and outputs `data-overlays="bottom"` only when supplied.

- [ ] **Step 1: Write the failing config tests**

  Add tests that use a live AdSense environment and settings with the master switch enabled. Assert:
  ```ts
  expect(getAnchorAdsConfig(settings, env, "/zh-tw/articles/guide"))
    .toEqual({ clientId: "ca-pub-123", overlays: "bottom" });
  expect(getAnchorAdsConfig(settings, env, "/zh-tw")).toEqual({ clientId: "ca-pub-123", overlays: "bottom" });
  expect(getAnchorAdsConfig(settings, env, "/zh-tw/category/software")).toEqual({ clientId: "ca-pub-123", overlays: "bottom" });
  expect(getAnchorAdsConfig({ ...settings, anchorAdsEnabled: false }, env, "/zh-tw"))
    .toBeNull();
  expect(getAnchorAdsConfig(settings, env, "/admin")).toBeNull();
  ```
  Add a script component test expecting `data-overlays="bottom"` and no attribute for an ordinary manual-ad script.

- [ ] **Step 2: Run the new tests to verify they fail**

  Run: `npm test -- src/lib/adsense/config.test.ts src/components/ads/adsense-script.test.tsx`

  Expected: FAIL because neither resolver nor `overlays` prop exists.

- [ ] **Step 3: Implement explicit public route classification**

  Add a root-locale regex in `config.ts`, alongside the existing article/category regexes. `getAnchorAdsConfig` must first require `NEXT_PUBLIC_ADSENSE_ENABLED === "true"` and a client ID, then map pathname to exactly one page type and check its owner flag. Return `null` on any other path or when any required gate fails.

- [ ] **Step 4: Make the script declarative**

  Update `AdsenseScript` to accept:
  ```tsx
  export function AdsenseScript({ clientId, overlays }: {
    clientId: string | null;
    overlays?: "bottom";
  })
  ```
  Retain the same script `id`, source and `crossOrigin`; add `data-overlays={overlays}` only for the Anchor configuration. Do not add `position: fixed`, a new `<ins>`, or an `adsbygoogle.push` call.

- [ ] **Step 5: Run the new tests to verify they pass**

  Run: `npm test -- src/lib/adsense/config.test.ts src/components/ads/adsense-script.test.tsx`

  Expected: PASS; script output has at most the approved bottom overlay attribute.

- [ ] **Step 6: Commit the isolated task**

  ```bash
  git add src/lib/adsense/config.ts src/lib/adsense/config.test.ts src/components/ads/adsense-script.tsx src/components/ads/adsense-script.test.tsx
  git commit -m "feat: configure bottom AdSense anchor ads"
  ```

### Task 3: Render the one page-level AdSense script on each eligible page

**Files:**
- Modify: `src/app/[locale]/(site)/layout.tsx:1-35`
- Modify: `src/app/[locale]/(site)/page.tsx:1-22`
- Create: `src/app/[locale]/(site)/page.test.tsx`
- Modify: `src/components/site/article-panel.tsx:1-59`
- Modify: `src/components/site/article-panel.test.tsx`
- Modify: `src/components/site/category-page.tsx:1-100`
- Modify: `src/components/site/category-page.test.tsx`
- Modify: `src/app/[locale]/(site)/articles/[slug]/actions.tsx:1-17`

**Interfaces:**
- Consumes `getOrCreateArticleAdSettings(prisma)` and `getAnchorAdsConfig(settings, env, pathname)`.
- `ArticlePanel` gains `includeAdsenseScript?: boolean`; it defaults to `false` and is `true` only for the initial article rendered in `[slug]/page.tsx`.
- Produces exactly one `<AdsenseScript>` per home, category, or initial article document.

- [ ] **Step 1: Write failing renderer tests**

  Mock Anchor settings as enabled and a production AdSense environment. Add assertions:
  ```tsx
  expect(screen.getByTestId("adsense-script")).toHaveAttribute("data-overlays", "bottom");
  ```
  for the home page, category page, and `ArticlePanel` with `initial: true`. Render a continuation panel with `initial: false` and assert no script test id is present. Add an article-feed action test that continuation output does not contain a second script.

- [ ] **Step 2: Run renderer tests to verify they fail**

  Run: `npm test -- 'src/app/[locale]/(site)/page.test.tsx' src/components/site/article-panel.test.tsx src/components/site/category-page.test.tsx 'src/app/[locale]/(site)/articles/[slug]/actions.test.tsx'`

  Expected: FAIL because home has no ad context and panels currently each render a script.

- [ ] **Step 3: Move script ownership to page renderers**

  Remove the unconditional public-site-layout `AdsenseScript`; layouts do not know the leaf page type. In the home page, resolve settings and public environment in parallel with its content data, then render `AdsenseScript` with `getAnchorAdsConfig(settings, env, \`/${locale}\`)`.

  In `CategoryPage`, reuse its existing environment/context and resolve settings once; pass a bottom overlay config only when its locale/category pathname is allowed. In the article page, pass `includeAdsenseScript={initial}` from the route page, then make `ArticlePanel` resolve and render Anchor config only when that prop is true. In `loadNextArticle`, omit the prop so continued articles never create an additional script.

- [ ] **Step 4: Preserve manual-slot behavior**

  Keep existing manual `AdSlot` calls and live-client detection. If an Anchor configuration has a client but a page has no manual slot (home), still render the script. Do not create Anchor previews in development.

- [ ] **Step 5: Run renderer tests to verify they pass**

  Run: `npm test -- 'src/app/[locale]/(site)/page.test.tsx' src/components/site/article-panel.test.tsx src/components/site/category-page.test.tsx 'src/app/[locale]/(site)/articles/[slug]/actions.test.tsx'`

  Expected: PASS; each eligible page has one bottom-overlay script and continuations have none.

- [ ] **Step 6: Commit the isolated task**

  ```bash
  git add 'src/app/[locale]/(site)/layout.tsx' 'src/app/[locale]/(site)/page.tsx' 'src/app/[locale]/(site)/page.test.tsx' src/components/site/article-panel.tsx src/components/site/article-panel.test.tsx src/components/site/category-page.tsx src/components/site/category-page.test.tsx 'src/app/[locale]/(site)/articles/[slug]/actions.tsx' 'src/app/[locale]/(site)/articles/[slug]/actions.test.tsx'
  git commit -m "feat: render AdSense anchor ads by public page type"
  ```

### Task 4: Add OWNER controls and cache invalidation

**Files:**
- Modify: `src/app/(backoffice)/admin/ads/actions.ts:1-39`
- Modify: `src/app/(backoffice)/admin/ads/actions.test.ts:1-55`
- Modify: `src/app/(backoffice)/admin/ads/page.tsx:1-31`
- Modify: `src/app/(backoffice)/admin/ads/page.test.tsx:1-30`

**Interfaces:**
- Consumes Task 1 settings.
- OWNER form field names: `anchorAdsEnabled`, `anchorAdsOnArticles`, `anchorAdsOnHome`, `anchorAdsOnCategories`.
- `saveArticleAdSettingsAction` persists cadence and all four boolean fields in one `upsert`.

- [ ] **Step 1: Write failing action and page tests**

  Expand the valid OWNER form fixture:
  ```ts
  form.set("anchorAdsEnabled", "on");
  form.set("anchorAdsOnArticles", "on");
  form.set("anchorAdsOnHome", "on");
  form.set("anchorAdsOnCategories", "on");
  ```
  Assert `upsert.create` and `upsert.update` contain the four booleans. Add a page test asserting the labelled master checkbox and three page-type checkboxes use persisted defaults.

- [ ] **Step 2: Run the admin tests to verify they fail**

  Run: `npm test -- 'src/app/(backoffice)/admin/ads/actions.test.ts' 'src/app/(backoffice)/admin/ads/page.test.tsx'`

  Expected: FAIL because the action ignores checkbox fields and the form does not expose them.

- [ ] **Step 3: Parse and persist checkbox values**

  Add:
  ```ts
  function checked(formData: FormData, field: string) {
    return formData.get(field) === "on";
  }
  ```
  Include the four returned booleans in validated settings before the upsert. Keep OWNER/must-change-password/stale-client checks before mutation. Keep `revalidatePath("/admin/ads")` plus public locale layout invalidation so existing visits obtain the new script configuration.

- [ ] **Step 4: Render an accessible Overlay Ads fieldset**

  In `/admin/ads`, add a `fieldset` titled `Anchor 廣告` with a master checkbox and three indented page-type checkboxes. Use `<input type="checkbox" defaultChecked={settings.anchorAdsEnabled}>`; disable the three dependent page-type checkboxes when the form itself is unavailable, not when the master is unchecked, so OWNER can preconfigure them before enabling the master.

- [ ] **Step 5: Run the admin tests to verify they pass**

  Run: `npm test -- 'src/app/(backoffice)/admin/ads/actions.test.ts' 'src/app/(backoffice)/admin/ads/page.test.tsx'`

  Expected: PASS; OWNER settings persist and are visible; stale Prisma clients still block writes safely.

- [ ] **Step 6: Commit the isolated task**

  ```bash
  git add 'src/app/(backoffice)/admin/ads/actions.ts' 'src/app/(backoffice)/admin/ads/actions.test.ts' 'src/app/(backoffice)/admin/ads/page.tsx' 'src/app/(backoffice)/admin/ads/page.test.tsx'
  git commit -m "feat: manage AdSense anchor ad settings"
  ```

### Task 5: Align breakpoint behavior, documentation, and end-to-end verification

**Files:**
- Modify: `src/app/globals.css` (desktop sticky breakpoint only, if current 1024px rule remains)
- Modify: `docs/article-auto-loading.md`
- Modify: `docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md`
- Modify: `docs/test-log.md`

**Interfaces:**
- Consumes completed settings, config resolver, script component, and page renderers.
- Produces documentation stating manual sidebar `>=1280px`, Auto ads Anchor bottom-only behavior, no floating video, and test results.

- [ ] **Step 1: Write a failing viewport assertion**

  In `src/components/ads/ad-slot.test.tsx`, change the desktop-only media-query expectation to `"(min-width: 1280px)"`; add a 1024px non-match case that asserts the manual sidebar does not initialize.

- [ ] **Step 2: Run the sidebar test to verify it fails**

  Run: `npm test -- src/components/ads/ad-slot.test.tsx`

  Expected: FAIL while code uses the prior 1024px media query or CSS breakpoint.

- [ ] **Step 3: Align the existing manual sidebar breakpoint**

  Update `AdSlot` desktop-only `matchMedia` and related `.article-layout`/`.desktop-ad-only` CSS to 1280px. Do not change regular in-page slots. Ensure only one manual sticky unit can be visible and it remains no wider than 300px.

- [ ] **Step 4: Run focused checks and browser verification**

  Run:
  ```bash
  npm test -- src/lib/adsense/article-ad-settings.test.ts src/lib/adsense/config.test.ts src/components/ads/adsense-script.test.tsx src/components/ads/ad-slot.test.tsx src/components/site/article-panel.test.tsx src/components/site/category-page.test.tsx 'src/app/[locale]/(site)/page.test.tsx' 'src/app/(backoffice)/admin/ads/actions.test.ts' 'src/app/(backoffice)/admin/ads/page.test.tsx'
  npx tsc --noEmit
  npx eslint src/lib/adsense/article-ad-settings.ts src/lib/adsense/config.ts src/components/ads/adsense-script.tsx src/components/ads/ad-slot.tsx src/components/site/article-panel.tsx src/components/site/category-page.tsx 'src/app/[locale]/(site)/page.tsx' 'src/app/(backoffice)/admin/ads/actions.ts' 'src/app/(backoffice)/admin/ads/page.tsx'
  git diff --check
  ```
  Apply `npm run db:migrate` only with a confirmed reachable direct PostgreSQL connection, then restart the dev server to load the generated Prisma client. Verify article, home, and category at 1440px, 768px, and 390px: manual sidebar appears only at 1440px; Auto ads is loaded only once and uses `data-overlays="bottom"`; no custom fixed container or video player is present.

- [ ] **Step 5: Record documentation and commit the isolated task**

  Update each document’s `最後更新：2026-09-08` field. In `docs/test-log.md`, record actual command output and any migration connectivity blocker without claiming an Anchor was served (serving remains Google-controlled).

  ```bash
  git add src/app/globals.css src/components/ads/ad-slot.test.tsx docs/article-auto-loading.md docs/superpowers/specs/2026-09-04-1wiki-adsense-seo-mvp-design.md docs/test-log.md
  git commit -m "docs: document AdSense anchor overlay behavior"
  ```

## Plan Self-Review

- Spec coverage: Task 1 persists OWNER policy; Task 2 enforces bottom-only Auto ads code; Task 3 limits script rendering to public page types and one document-level configuration; Task 4 exposes and invalidates OWNER settings; Task 5 enforces the PC-only manual sidebar and records verification.
- No-placeholder scan: every task contains exact files, signatures, commands, expected red/green outcome, and implementation constraints.
- Type consistency: all downstream tasks use `ArticleAdSettings`, `getAnchorAdsConfig`, and the four `anchorAds*` field names introduced in Tasks 1–2.
