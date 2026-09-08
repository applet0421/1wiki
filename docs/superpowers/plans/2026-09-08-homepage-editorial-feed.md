# Homepage Editorial Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the locale homepage into a compact introductory surface with one featured latest guide, a scannable latest-guide list, and category shortcuts after the content.

**Architecture:** `HomePage` will partition the existing, newest-first `posts` array into `posts[0]` for a new homepage-only featured guide and `posts.slice(1)` for the existing `ArticleCard` list. Homepage-specific semantic class names and media queries in `globals.css` will control the feature and list hierarchy without changing the category-page card contract. All new visible labels will come from the existing `dictionary.home` object for zh-TW, English, and Japanese.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, CSS media queries, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-08-homepage-editorial-feed-design.md`

## Global Constraints

- Preserve the current `getHomeData(locale)` query, 12-post limit, root-category source, locale routing, and empty-state behavior.
- Keep existing Homepage Anchor ad configuration; do not create home top, sidebar, or inline ad slots.
- Use translated `dictionary.home` strings rather than hard-coded UI copy.
- Preserve genuine keyboard-accessible article and category links; do not nest anchors.
- Do not alter category-page layouts or their ArticleCard responsive behavior.
- Verify 375px, 768px, 1024px, 1440px, and wide desktop visual states after code changes.

---

## File Structure

- Modify: `src/app/[locale]/(site)/page.tsx` — partition the existing posts, render the homepage information hierarchy, and attach homepage-only classes.
- Modify: `src/app/[locale]/(site)/page.test.tsx` — define homepage data-partition and semantic-order regression coverage.
- Modify: `src/lib/i18n/dictionaries.ts` — provide all new translated home-section labels.
- Modify: `src/app/globals.css` — scope featured/list/category-shortcut responsive styles to the homepage only.
- Modify: `docs/test-log.md` — append the final focused test and visual-regression execution record using its existing format.

### Task 1: Define homepage labels and rendering contract

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts`
- Modify: `src/app/[locale]/(site)/page.tsx`
- Test: `src/app/[locale]/(site)/page.test.tsx`

**Interfaces:**
- Consumes: `SiteDictionary["home"]`, `getHomeData(locale): Promise<[Post[], RootCategory[]]>`.
- Produces: `dictionary.home.featuredEyebrow`, `dictionary.home.featuredTitle`, and homepage landmarks `home-featured-guide`, `latest-answers`, `home-topic-shortcuts`.

- [ ] **Step 1: Write the failing homepage hierarchy tests**

  Import `within` from `@testing-library/react`. Add a three-post test fixture and assert that the first title appears inside the featured region, the next two titles appear in `latest-answers`, and the featured region precedes the list and topic shortcuts:

  ```tsx
  const featured = screen.getByTestId("home-featured-guide");
  const latest = screen.getByTestId("latest-answers");
  const topics = screen.getByTestId("home-topic-shortcuts");

  expect(within(featured).getByRole("heading", { name: "第一篇教學" })).toBeInTheDocument();
  expect(within(latest).getByRole("heading", { name: "第二篇教學" })).toBeInTheDocument();
  expect(within(latest).getByRole("heading", { name: "第三篇教學" })).toBeInTheDocument();
  expect(featured.compareDocumentPosition(latest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(latest.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  ```

- [ ] **Step 2: Run the focused test and verify failure**

  Run: `npm test -- src/app/[locale]/(site)/page.test.tsx`

  Expected: FAIL because `home-featured-guide` and `home-topic-shortcuts` do not exist and all posts are currently rendered in one list.

- [ ] **Step 3: Add locale-safe labels**

  Add the following keys to the `home` object in the zh-TW dictionary and equivalent natural translations in English and Japanese:

  ```ts
  featuredEyebrow: "精選解答",
  featuredTitle: "最新值得先看的解法",
  topicShortcutsEyebrow: "探索主題",
  topicShortcutsTitle: "繼續找你需要的解法",
  ```

  Keep the `DictionaryShape` constraint satisfied so missing translations fail TypeScript checking.

- [ ] **Step 4: Partition posts and render semantic homepage sections**

  In `HomePage`, derive the first and remaining posts before JSX:

  ```tsx
  const [featuredPost, ...latestPosts] = posts;
  ```

  Render the existing intro first, then a `section` with `data-testid="home-featured-guide"` for `featuredPost`, followed by a `section` containing `<div className="article-list" data-testid="latest-answers">` that maps `latestPosts`. Render the category links last in `section data-testid="home-topic-shortcuts"`.

  The featured guide must use a real `Link` to `/${locale}/articles/${featuredPost.slug}`, reuse its category URL from `getCategoryHref`, and render category, title, excerpt, date, cover image when present, and the current `dictionary.article.readMore` CTA. Keep the no-post branch unchanged.

- [ ] **Step 5: Run the focused test and verify success**

  Run: `npm test -- src/app/[locale]/(site)/page.test.tsx`

  Expected: PASS, including existing root-category URL, revised hero copy, and empty-state assertions.

- [ ] **Step 6: Commit the contract change**

  ```bash
  git add src/lib/i18n/dictionaries.ts 'src/app/[locale]/(site)/page.tsx' 'src/app/[locale]/(site)/page.test.tsx'
  git commit -m "feat: prioritize featured guides on home"
  ```

### Task 2: Add scoped responsive homepage presentation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/(site)/page.tsx`
- Test: `src/app/[locale]/(site)/page.test.tsx`

**Interfaces:**
- Consumes: `home-hero`, `home-featured-guide`, `home-latest-list`, and `home-topic-shortcuts` landmarks emitted by Task 1.
- Produces: homepage-only responsive visual hierarchy that does not change `.category-article-item` behavior.

- [ ] **Step 1: Extend the failing test with homepage-only class assertions**

  Assert that the featured region has `home-featured-guide`, the latest list has `home-latest-list`, and category shortcuts retain `category-grid` plus `home-topic-shortcuts`:

  ```tsx
  expect(featured).toHaveClass("home-featured-guide");
  expect(latest).toHaveClass("home-latest-list");
  expect(topics).toHaveClass("home-topic-shortcuts");
  expect(topics.querySelector(".category-grid")).toBeInTheDocument();
  ```

- [ ] **Step 2: Run the focused test and verify failure**

  Run: `npm test -- src/app/[locale]/(site)/page.test.tsx`

  Expected: FAIL because Task 1 establishes semantic test IDs but does not yet attach the presentation classes.

- [ ] **Step 3: Implement the desktop presentation in `globals.css`**

  In `page.tsx`, add `home-featured-guide` to the featured section, `home-featured-card` to its article, `home-latest-list` to the latest-list div, and `home-topic-shortcuts` to the category section. Then replace the home-only tall hero rule with a compact `home-hero` (`min-height: 0`, `padding-block: clamp(2.5rem, 6vw, 5rem) clamp(2rem, 4vw, 3.5rem)`) and add styles following this shape:

  ```css
  .home-featured-guide { margin-bottom: clamp(2.5rem, 5vw, 4rem); }
  .home-featured-card { display: grid; grid-template-columns: minmax(18rem, .9fr) minmax(0, 1.1fr); gap: clamp(1.5rem, 3vw, 2.75rem); }
  .home-latest-list { gap: 0; border-top: 1px solid #dce3ee; }
  .home-latest-list .article-card { border-width: 0 0 1px; border-radius: 0; padding-block: 1.5rem; }
  .home-topic-shortcuts { margin-top: clamp(3rem, 6vw, 5rem); }
  ```

  Scope all selectors under `.home-*`; do not modify `.category-article-item` or its breakpoint rules. Use 4:3 `aspect-ratio` and `object-fit: cover` on the featured cover. Preserve the existing blue/neutral tokens, modest borders, and no card-within-card treatment.

- [ ] **Step 4: Add breakpoint rules**

  At `max-width: 1279px`, keep the homepage as one content column. At `max-width: 900px`, reduce feature/list gaps and preserve horizontal article rows where available. At `max-width: 640px`, switch `.home-featured-card` and `.home-latest-list .article-card` to block layout; use a 16:9 featured cover, compact 16:9 list covers, and ensure no fixed dimensions create horizontal scrolling.

- [ ] **Step 5: Run the focused component suite**

  Run: `npm test -- src/app/[locale]/(site)/page.test.tsx src/components/site/article-card.test.tsx`

  Expected: PASS. The ArticleCard suite confirms its category-page contract still renders its existing classes and links.

- [ ] **Step 6: Commit the responsive presentation**

  ```bash
  git add src/app/globals.css 'src/app/[locale]/(site)/page.tsx' 'src/app/[locale]/(site)/page.test.tsx'
  git commit -m "feat: add responsive homepage editorial layout"
  ```

### Task 3: Verify rendering, accessibility, and regression record

**Files:**
- Modify: `docs/test-log.md`
- Test: `src/app/[locale]/(site)/page.test.tsx`
- Test: `src/components/site/article-card.test.tsx`

**Interfaces:**
- Consumes: completed homepage markup and CSS from Tasks 1–2.
- Produces: a reproducible validation record for the homepage redesign.

- [ ] **Step 1: Run the complete focused suite**

  Run:

  ```bash
  npm test -- \
    'src/app/[locale]/(site)/page.test.tsx' \
    src/components/site/article-card.test.tsx \
    src/components/site/category-page.test.tsx \
    src/components/site/category-article-list.test.tsx
  ```

  Expected: all tests PASS; this demonstrates homepage changes did not regress shared ArticleCard/category behavior.

- [ ] **Step 2: Perform browser checks at each required viewport**

  Use the local dev server and inspect `http://localhost:3000/zh-tw` at `375x844`, `768x1024`, `1024x900`, `1440x1024`, and a wide desktop viewport. For every viewport confirm:

  ```text
  - the featured title is visible before the latest list;
  - feature/list images retain their intended aspect ratios without distortion;
  - the content has no horizontal page overflow;
  - every feature/list title and CTA resolves to the article URL;
  - topic shortcuts are after the latest content.
  ```

- [ ] **Step 3: Run whitespace validation**

  Run: `git diff --check`

  Expected: no output and exit status 0.

- [ ] **Step 4: Record exact validation evidence**

  Append a dated entry to `docs/test-log.md` using its existing heading format. Record the focused Vitest command, successful result count, the five viewport sizes, and whether all five checks above passed. If full lint is run, record the known unrelated `src/lib/wechat-import/browser-extractor.ts` findings separately instead of attributing them to this change.

- [ ] **Step 5: Commit the validation record**

  ```bash
  git add docs/test-log.md
  git commit -m "test: record homepage editorial layout validation"
  ```
