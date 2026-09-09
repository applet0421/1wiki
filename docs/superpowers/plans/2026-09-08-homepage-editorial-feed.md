# Homepage Minimal Article Feed Implementation Plan

最後更新：2026-09-09

文件狀態：進行中；對應程式仍在未提交工作樹，尚待全量驗證與瀏覽器驗收。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the locale homepage as a compact reading introduction followed by the same article-card feed and ad rhythm used on category pages.

**Architecture:** Extract category list markup and interval-aware Inline insertion into a reusable component. Category pages retain their loading state; homepage passes its static newest-first posts into that component and composes homepage-specific Inline, end, and desktop sidebar placements. Homepage CSS controls only its compact intro and sidebar, while cards retain category classes.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-08-homepage-editorial-feed-design.md`

## Global Constraints

- Keep the 12-post query, locale routing, root categories, empty state, and Homepage Anchor setting.
- No top ad. Reuse `categoryInlineAdInterval` (4–20) and insert Inline only when another article follows the interval boundary.
- Reuse `ArticleCard`, `category-article-list`, `category-article-item`, and category responsive card rules.
- Homepage sidebar is only eligible at ≥1280px; no sidebar at 901–1279px or below.
- Use `dictionary.home` for visible copy. Do not add a database setting or homepage loading API.

### Task 1: Extract the reusable category-style feed

**Files:**
- Create: `src/components/site/article-feed-list.tsx`
- Create: `src/components/site/article-feed-list.test.tsx`
- Modify: `src/components/site/category-article-list.tsx`
- Test: `src/components/site/category-article-list.test.tsx`

**Interface:** `ArticleFeedList({ posts, locale, dictionary, inlineAdConfig, adInterval, testId? })` renders a `category-article-list` ordered list.

- [ ] Write a failing `article-feed-list.test.tsx` using 3 posts and `adInterval={2}`; assert no preview ad, since the second post has no later article. Render 4 posts and assert exactly one preview follows the second row:

  ```tsx
  expect(screen.getAllByTestId("ad-preview-category_inline")).toHaveLength(1);
  expect(screen.getByText("教學 2").closest("li")?.nextElementSibling).toHaveClass("category-feed-ad");
  ```

- [ ] Run `npm test -- src/components/site/article-feed-list.test.tsx`; expect failure because the component does not exist.
- [ ] Create the client component, mapping each post to `<li className="category-article-item"><ArticleCard … /></li>` and add `<li className="category-feed-ad"><AdSlot placement={inlineAdConfig?.placement ?? "category_inline"} config={inlineAdConfig} /></li>` when `(index + 1) % adInterval === 0 && index + 1 < posts.length`. Normalize non-null dates with `new Date(post.publishedAt)`.
- [ ] Replace the ordered-list JSX in `CategoryArticleList` with `ArticleFeedList`; retain its observer, API URL, sentinel, loading and all props.
- [ ] Run `npm test -- src/components/site/article-feed-list.test.tsx src/components/site/category-article-list.test.tsx`; expect PASS.
- [ ] Commit:

  ```bash
  git add src/components/site/article-feed-list.tsx src/components/site/article-feed-list.test.tsx src/components/site/category-article-list.tsx src/components/site/category-article-list.test.tsx
  git commit -m "refactor: share category-style article feed"
  ```

### Task 2: Add homepage feed placements

**Files:**
- Modify: `src/lib/adsense/config.ts`
- Test: `src/lib/adsense/config.test.ts`
- Modify: `src/components/ads/ad-slot.tsx`

**Interface:** valid placements become `home_inline`, `home_end`, and `home_sidebar_desktop`, accepted only for `^/(zh-tw|en|ja)$` published home paths.

- [ ] Add failing config tests:

  ```ts
  expect(getAdSlotConfig("home_inline", env, { pathname: "/zh-tw", published: true })).toMatchObject({ mode: "live", placement: "home_inline", shape: "rectangle" });
  expect(getAdSlotConfig("home_end", env, { pathname: "/zh-tw", published: false })).toBeNull();
  expect(getAdSlotConfig("home_sidebar_desktop", env, { pathname: "/zh-tw/category/ai", published: true })).toBeNull();
  ```

- [ ] Run `npm test -- src/lib/adsense/config.test.ts`; expect TypeScript failure because the three placements are absent.
- [ ] Add placement keys, environment names and shapes:

  ```ts
  home_inline: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_INLINE" // rectangle
  home_end: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_END" // banner
  home_sidebar_desktop: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR_DESKTOP" // rectangle
  ```

  In `getAdSlotConfig`, compute `isHome = homePathPattern.test(context.pathname)` and return `null` unless every `home_` placement is `isHome && context.published`. Leave article/category gates and `feed_inline` unchanged.
- [ ] Add `placement === "home_sidebar_desktop"` to `AdSlot`’s `desktopOnly` expression.
- [ ] Run `npm test -- src/lib/adsense/config.test.ts src/components/ads/ad-slot.test.tsx`; expect PASS.
- [ ] Commit the four tested files with `git commit -m "feat: add homepage article feed placements"`.

### Task 3: Compose the minimal homepage

**Files:**
- Modify: `src/app/[locale]/(site)/page.tsx`
- Test: `src/app/[locale]/(site)/page.test.tsx`
- Modify: `src/lib/i18n/dictionaries.ts`
- Modify: `src/app/globals.css`

**Interface:** `HomePage` renders `.home-intro`, an `ArticleFeedList` carrying `data-testid="latest-answers"`, optional home end/sidebar slots, then `.home-topic-shortcuts`.

- [ ] Add a failing 5-post homepage test with `categoryInlineAdInterval: 4`: assert a `category-article-list`, five articles, one `home_inline` preview after row four, `home_end`, `home_sidebar_desktop`, and topic shortcuts after `latest-answers`.
- [ ] Run `npm test -- 'src/app/[locale]/(site)/page.test.tsx`; expect failure because home still uses `article-list`, category-first ordering, and no home slots.
- [ ] Add translated `topicShortcutsEyebrow` and `topicShortcutsTitle` to all dictionaries. In `HomePage`, preserve empty/Anchor logic; compute `showAds = posts.length >= 4`, home context/path and live placement status. Render:

  ```tsx
  <section className="home-intro">…eyebrow, h1, intro…</section>
  <div className="category-content-layout"><section aria-label="文章列表">…<ArticleFeedList posts={posts} adInterval={adSettings.categoryInlineAdInterval} inlineAdConfig={getAdSlotConfig("home_inline", env, context)} testId="latest-answers" />…</section>{showAds ? <aside className="home-sidebar"><AdSlot placement="home_sidebar_desktop" config={…} /></aside> : null}</div>
  <section className="home-topic-shortcuts" data-testid="home-topic-shortcuts">…root category cards…</section>
  ```

  Add `home_end` directly after the list only when `showAds`.
- [ ] Add only shell CSS: `.home-intro` with compact padding, `max-width:48rem`, H1 `clamp(1.7rem,3vw,2.7rem)`, muted intro; sticky `.home-sidebar`; trailing `.home-topic-shortcuts`; hide `.home-sidebar` in existing `max-width:1279px`. Do not alter category card/list declarations.
- [ ] Run homepage/feed/category/card suites; expect PASS. Commit homepage files with `git commit -m "feat: rebuild home as minimal article feed"`.

### Task 4: Verify and record

**Files:** `docs/test-log.md`

- [ ] Run homepage, shared-feed, category-feed, ArticleCard, category-page, config, and AdSlot tests plus `git diff --check`; all must pass.
- [ ] At 375×844, 768×1024, 1024×900, 1440×1024 and 1835×1368 verify no horizontal overflow, shared category list/card classes, sidebar absence below 1280px, interval-aware Inline position, and topic shortcuts after feed/end ad.
- [ ] Append the exact test command, test result, five viewports and checks to `docs/test-log.md`; commit with `git commit -m "test: record homepage minimal feed validation"`.
