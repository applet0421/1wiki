# 1Wiki Locale Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 1Wiki 公開內容移至可擴充的語系前綴路由，預設繁體中文並提供英文、日文空白首頁與語言選擇器，同時確保內容、SEO、後台及 AI 流程依語系隔離。

**Architecture:** 使用單一 `Locale` 設定與型別化字典作為語系真實來源，公開頁面放在 Next.js 16 App Router 的 `[locale]` root layout，後台與登入使用另一個無語系前綴的 root layout。PostgreSQL 以 `locale` 欄位、複合唯一鍵和複合外鍵隔離文章與分類；所有公開查詢、metadata、JSON-LD、sitemap 與 AdSense 路徑均顯式接收語系。

**Tech Stack:** Next.js 16.3.4 App Router、React 19.2.8、TypeScript 6.0.3、Prisma 7.10.0、PostgreSQL、Vitest 5、Testing Library、Playwright 1.62.1。

**Spec:** `docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md`

## Global Constraints

- 第一階段支援且可選的路由語系固定為 `zh-tw`、`en`、`ja`，預設為 `zh-tw`。
- `/` 與既有無語系前綴公開網址使用 308 永久轉址至 `/zh-tw/...`，不得依 cookie、瀏覽器語言或 IP 改變。
- 英文與日文沒有已發布內容時顯示各自語言的空白首頁，不得混入繁體中文資料。
- 空白語系首頁輸出 `noindex, follow` 且不加入 sitemap；有第一篇已發布文章後才可索引。
- 不建立翻譯群組、對應文章、自動翻譯或跨語系 `hreflang`。
- `/admin`、`/login`、`/change-password`、`/ads.txt`、`/robots.txt`、`/sitemap.xml` 與靜態資源維持無語系前綴。
- 執行前先保留並整合工作區內既有 AI 內容生成修改，不覆寫或回退不屬於本計畫的變更。
- 寫入 Next.js 程式碼前，依 `AGENTS.md` 重新閱讀 `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`、`redirecting.md` 及相關 deprecation notice。
- 所有功能與 migration 先在本機驗證；未取得專案負責人明確確認前，不部署 Vercel、不修改遠端資料庫或正式環境變數。

---

## File Structure

新增的核心檔案：

- `src/lib/i18n/config.ts`：支援語系、預設語系、語系 metadata 與 type guard。
- `src/lib/i18n/config.test.ts`：語系設定與型別縮窄測試。
- `src/lib/i18n/dictionaries.ts`：三種語系的網站框架文字與型別化存取函式。
- `src/lib/i18n/dictionaries.test.ts`：必要字典 key 與語系內容測試。
- `src/components/site/language-switcher.tsx`：可存取且不依賴 JavaScript 的語言選擇器。
- `src/components/site/language-switcher.test.tsx`：目前語系與目標連結測試。
- `src/app/[locale]/layout.tsx`：公開網站 root layout、語系驗證、`html lang` 與網站 metadata。
- `src/app/(backoffice)/layout.tsx`：後台及登入 root layout。
- `src/app/[locale]/not-found.tsx`、`src/app/[locale]/error.tsx`：公開網站語系感知錯誤頁。
- `src/app/[locale]/(site)/**`：由現有公開頁面搬移後的語系路由。
- `prisma/migrations/20260904130000_add_content_locales/migration.sql`：既有資料回填、唯一鍵及複合外鍵 migration。

主要修改檔案：

- `prisma/schema.prisma`、`prisma/seed.ts`：加入 locale 欄位、索引、關聯與繁體中文初始分類。
- `src/lib/content/schema.ts`、`repository.ts` 及測試：輸入與查詢全面加入 locale。
- `src/app/admin/**`、`src/components/admin/post-editor.tsx`：語系篩選、表單欄位與同語系分類。
- `src/lib/ai/types.ts`、`prompt.ts`、生成與改寫流程及測試：AI 任務顯式接收目標語系。
- `src/components/site/header.tsx`、`footer.tsx`、`article-card.tsx`、`breadcrumbs.tsx`、`category-page.tsx`：語系化文字與連結。
- `src/lib/seo/metadata.ts`、`structured-data.ts` 與測試：語系 URL、Open Graph locale 及 `inLanguage`。
- `src/app/sitemap-data.ts`、`sitemap.ts`、`manifest.ts`、`robots.ts`：語系索引規則。
- `src/lib/adsense/config.ts` 及測試：接受語系前綴文章路徑。
- `next.config.ts`：根網址及舊公開網址的永久轉址。
- `tests/e2e/global-setup.ts`、`public-pages.spec.ts`、`adsense-disabled.spec.ts`：語系資料與公開行為回歸。
- `README.md`：公開網址、內容語系與本機驗收說明。

---

### Task 1: 建立語系設定與型別化字典

**Files:**
- Create: `src/lib/i18n/config.ts`
- Create: `src/lib/i18n/config.test.ts`
- Create: `src/lib/i18n/dictionaries.ts`
- Create: `src/lib/i18n/dictionaries.test.ts`
- Modify: `src/lib/config/site.ts`
- Modify: `src/lib/config/site.test.ts`

**Interfaces:**
- Produces: `supportedLocales`, `defaultLocale`, `Locale`, `LocaleConfig`, `isLocale(value)`, `getLocaleConfig(locale)`, `getDictionary(locale)`。
- Consumes: 無前置任務介面。

- [ ] **Step 1: 寫出失敗的語系設定測試**

```ts
import { describe, expect, it } from "vitest";
import { defaultLocale, getLocaleConfig, isLocale, supportedLocales } from "./config";

describe("locale config", () => {
  it("exposes zh-tw as default and keeps the supported order", () => {
    expect(defaultLocale).toBe("zh-tw");
    expect(supportedLocales).toEqual(["zh-tw", "en", "ja"]);
  });

  it("rejects unknown and differently cased route segments", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("fr")).toBe(false);
  });

  it("maps route locales to platform locale values", () => {
    expect(getLocaleConfig("zh-tw")).toMatchObject({ htmlLang: "zh-Hant-TW", openGraphLocale: "zh_TW", dateLocale: "zh-TW" });
    expect(getLocaleConfig("en")).toMatchObject({ htmlLang: "en", openGraphLocale: "en_US", dateLocale: "en" });
    expect(getLocaleConfig("ja")).toMatchObject({ htmlLang: "ja", openGraphLocale: "ja_JP", dateLocale: "ja-JP" });
  });
});
```

- [ ] **Step 2: 執行測試並確認因模組不存在而失敗**

Run: `npm test -- src/lib/i18n/config.test.ts`

Expected: FAIL，錯誤包含無法解析 `./config`。

- [ ] **Step 3: 實作集中語系設定**

```ts
export const supportedLocales = ["zh-tw", "en", "ja"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "zh-tw";

export type InfoPageSlug = "about" | "contact" | "privacy" | "terms";

export type LocaleConfig = {
  label: string;
  htmlLang: string;
  openGraphLocale: string;
  dateLocale: string;
  publishedInfoPages: readonly InfoPageSlug[];
};

const localeConfig = {
  "zh-tw": { label: "繁體中文", htmlLang: "zh-Hant-TW", openGraphLocale: "zh_TW", dateLocale: "zh-TW", publishedInfoPages: ["about", "contact", "privacy", "terms"] },
  en: { label: "English", htmlLang: "en", openGraphLocale: "en_US", dateLocale: "en", publishedInfoPages: [] },
  ja: { label: "日本語", htmlLang: "ja", openGraphLocale: "ja_JP", dateLocale: "ja-JP", publishedInfoPages: [] },
} satisfies Record<Locale, LocaleConfig>;

export function isLocale(value: string): value is Locale {
  return supportedLocales.some((locale) => locale === value);
}

export function getLocaleConfig(locale: Locale): LocaleConfig {
  return localeConfig[locale];
}
```

- [ ] **Step 4: 寫出字典完整性與空白首頁文案測試**

```ts
import { describe, expect, it } from "vitest";
import { supportedLocales } from "./config";
import { getDictionary } from "./dictionaries";

describe("locale dictionaries", () => {
  it.each(supportedLocales)("provides the complete shell for %s", (locale) => {
    const dictionary = getDictionary(locale);
    expect(dictionary.site.name).toBeTruthy();
    expect(dictionary.navigation.language).toBeTruthy();
    expect(dictionary.home.emptyTitle).toBeTruthy();
    expect(dictionary.article.readMore).toBeTruthy();
  });

  it("provides native empty states for English and Japanese", () => {
    expect(getDictionary("en").home.emptyTitle).toBe("Content coming soon");
    expect(getDictionary("ja").home.emptyTitle).toBe("コンテンツを準備中です");
  });
});
```

- [ ] **Step 5: 實作以繁體中文 shape 為契約的同步字典**

在 `dictionaries.ts` 建立 `zhTwDictionary`，包含 `site`、`navigation`、`home`、`category`、`article`、`footer`、`notFound`、`error`、`infoUnavailable`。英文及日文字典使用 `satisfies typeof zhTwDictionary`，並匯出：

```ts
import type { Locale } from "./config";

export type SiteDictionary = typeof zhTwDictionary;

const dictionaries = {
  "zh-tw": zhTwDictionary,
  en: enDictionary,
  ja: jaDictionary,
} satisfies Record<Locale, SiteDictionary>;

export function getDictionary(locale: Locale): SiteDictionary {
  return dictionaries[locale];
}
```

`siteConfig` 只保留全站不因語系改變的 `shortName`；語系化的網站名稱、描述與 locale 改由字典及 `getLocaleConfig` 提供。

- [ ] **Step 6: 執行語系及網站設定測試**

Run: `npm test -- src/lib/i18n/config.test.ts src/lib/i18n/dictionaries.test.ts src/lib/config/site.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交語系核心**

```bash
git add src/lib/i18n src/lib/config/site.ts src/lib/config/site.test.ts
git commit -m "feat: add locale configuration and dictionaries"
```

---

### Task 2: 以資料庫約束隔離各語系內容

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260904130000_add_content_locales/migration.sql`
- Modify: `prisma/seed.ts`
- Modify: `src/lib/content/schema.ts`
- Modify: `src/lib/content/repository.ts`
- Modify: `src/lib/content/repository.test.ts`
- Modify: `tests/helpers/database.ts`

**Interfaces:**
- Consumes: `Locale`、`isLocale`、`defaultLocale` from Task 1。
- Produces: `localeSchema`；`listPublishedPosts(client, locale, limit?)`、`getPublishedPostBySlug(client, locale, slug)`、`getPublishedCategory(client, locale, slug)`、`hasPublishedPosts(client, locale)`、`findAvailablePostSlug(client, locale, requestedSlug)`、`listAdminPosts(client, locale?)`、`listCategories(client, locale?)`。

- [ ] **Step 1: 擴充 repository 整合測試，先描述資料隔離行為**

測試 fixture 的分類及 `postInput` 都加入 `locale: "zh-tw"`，再加入：

```ts
it("allows the same slug in different locales and isolates public reads", async () => {
  const { author } = await fixture();
  const en = await createCategory(prisma, { locale: "en", name: "AI", slug: "ai", description: "AI guides" });
  const ja = await createCategory(prisma, { locale: "ja", name: "AI", slug: "ai", description: "AI ガイド" });

  await savePost(prisma, author.id, postInput(en.id, { locale: "en", slug: "shared", status: "PUBLISHED" }));
  await savePost(prisma, author.id, postInput(ja.id, { locale: "ja", slug: "shared", status: "PUBLISHED" }));

  await expect(getPublishedPostBySlug(prisma, "en", "shared")).resolves.toMatchObject({ locale: "en" });
  await expect(getPublishedPostBySlug(prisma, "zh-tw", "shared")).resolves.toBeNull();
});

it("rejects a category from another locale", async () => {
  const { author, category } = await fixture();
  await expect(savePost(prisma, author.id, postInput(category.id, { locale: "en" })))
    .rejects.toThrow("文章語系必須與分類一致");
});

it("reports whether a locale has published content", async () => {
  const { author, category } = await fixture();
  await expect(hasPublishedPosts(prisma, "en")).resolves.toBe(false);
  await savePost(prisma, author.id, postInput(category.id, { status: "PUBLISHED" }));
  await expect(hasPublishedPosts(prisma, "zh-tw")).resolves.toBe(true);
});
```

- [ ] **Step 2: 執行 repository 測試並確認缺少 locale API**

Run: `npm test -- src/lib/content/repository.test.ts`

Expected: FAIL，至少包含 `locale` 欄位或新函式尚不存在的錯誤。

- [ ] **Step 3: 更新 Prisma schema 與 SQL migration**

在 `Category`、`Post` 加入 `locale String`，將關聯改成：

```prisma
model Category {
  id     String @id @default(cuid())
  locale String
  posts  Post[]

  @@unique([id, locale])
  @@unique([locale, slug])
}

model Post {
  locale     String
  categoryId String
  category   Category @relation(fields: [categoryId, locale], references: [id, locale], onDelete: Restrict)

  @@unique([locale, slug])
  @@index([locale, status, publishedAt])
}
```

Migration 必須依序加入有預設值的欄位、回填、移除舊唯一鍵與外鍵、建立複合鍵、建立複合外鍵，最後移除資料庫 default：

```sql
ALTER TABLE "Category" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'zh-tw';
ALTER TABLE "Post" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'zh-tw';
ALTER TABLE "Post" DROP CONSTRAINT "Post_categoryId_fkey";
DROP INDEX "Category_slug_key";
DROP INDEX "Post_slug_key";
CREATE UNIQUE INDEX "Category_id_locale_key" ON "Category"("id", "locale");
CREATE UNIQUE INDEX "Category_locale_slug_key" ON "Category"("locale", "slug");
CREATE UNIQUE INDEX "Post_locale_slug_key" ON "Post"("locale", "slug");
CREATE INDEX "Post_locale_status_publishedAt_idx" ON "Post"("locale", "status", "publishedAt");
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_locale_fkey" FOREIGN KEY ("categoryId", "locale") REFERENCES "Category"("id", "locale") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ALTER COLUMN "locale" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "locale" DROP DEFAULT;
```

- [ ] **Step 4: 重新產生 Prisma Client 並套用本機測試 migration**

Run: `npm run prisma:generate`

Expected: Prisma Client 成功產生，沒有 relation validation error。

Run: `npm run db:migrate`

Expected: migration 成功套用至本機設定的資料庫；若該命令指向非本機資料庫則停止，不執行 migration。

- [ ] **Step 5: 更新 Zod 輸入與 repository**

`postInputSchema` 與 `categoryInputSchema` 加入由 `supportedLocales` 產生的語系驗證。`savePost` 先查詢 `categoryId`，確認 `category.locale === input.locale`，再寫入。公開查詢全部以 locale 過濾，slug 查找改用複合 unique。`getPublishedCategory` 只回傳至少包含一篇同語系已發布文章的分類；沒有已發布文章的分類直接回傳 null，避免產生空白分類頁：

```ts
export const localeSchema = z.enum(supportedLocales);

export function getPublishedPostBySlug(client: PrismaClient, locale: Locale, slug: string) {
  return client.post.findFirst({
    where: { locale, slug, status: "PUBLISHED" },
    include: { category: true, author: { select: { displayName: true } } },
  });
}

export function hasPublishedPosts(client: PrismaClient, locale: Locale): Promise<boolean> {
  return client.post.count({ where: { locale, status: "PUBLISHED" } }).then((count) => count > 0);
}
```

`mapPrismaError` 將複合外鍵錯誤轉為「文章語系必須與分類一致」，複合 slug 唯一鍵仍轉為「網址代稱已被使用」。

- [ ] **Step 6: 更新 seed 與測試資料清理**

初始分類全部加入 `locale: defaultLocale`，upsert 改用 `locale_slug: { locale: defaultLocale, slug }`。資料清理仍先刪 Post 再刪 Category，避免複合外鍵違反。

- [ ] **Step 7: 執行 repository、seed 與 Prisma 驗證**

Run: `npx prisma validate && npm test -- src/lib/content/repository.test.ts tests/integration/bootstrap-owner.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交資料隔離**

```bash
git add prisma/schema.prisma prisma/migrations/20260904130000_add_content_locales/migration.sql prisma/seed.ts src/lib/content/schema.ts src/lib/content/repository.ts src/lib/content/repository.test.ts tests/helpers/database.ts
git commit -m "feat: isolate content by locale"
```

---

### Task 3: 讓後台文章與分類流程感知語系

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/page.test.tsx`
- Modify: `src/app/admin/posts/actions.ts`
- Modify: `src/app/admin/posts/new/page.tsx`
- Modify: `src/app/admin/posts/[id]/page.tsx`
- Modify: `src/app/admin/categories/actions.ts`
- Modify: `src/app/admin/categories/page.tsx`
- Modify: `src/components/admin/post-editor.tsx`
- Modify: `src/components/admin/post-editor.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `Locale`、`supportedLocales`、`defaultLocale`、`getLocaleConfig` from Task 1；locale-aware repository APIs from Task 2。
- Produces: 後台 query string `?locale=<Locale>`；表單欄位 `name="locale"`；`PostEditor` props 的 `locale` 與含 locale 的分類選項。

- [ ] **Step 1: 新增後台元件測試**

```tsx
it("renders a locale selector and only matching categories", () => {
  render(<PostEditor
    locale="en"
    categories={[{ id: "en-cat", name: "AI", locale: "en" }]}
    provider="deepseek"
    showAIGenerator={false}
  />);
  expect(screen.getByLabelText("內容語系")).toHaveValue("en");
  expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "AI" })).toBeInTheDocument();
});
```

在 `admin/page.test.tsx` mock 一筆英文文章，確認列表顯示 `English`，並確認 `listAdminPosts` 收到搜尋參數中的 `en`。

- [ ] **Step 2: 執行後台測試並確認 locale UI 尚不存在**

Run: `npm test -- src/components/admin/post-editor.test.tsx src/app/admin/page.test.tsx`

Expected: FAIL，找不到「內容語系」或 repository 呼叫參數不符。

- [ ] **Step 3: 更新後台頁面與表單**

文章、分類列表接受 `searchParams.locale`，只有 `isLocale(value)` 時才套用篩選。頁面使用 GET form 顯示三個語系；新增文章以 query string 或 `defaultLocale` 決定預設語系。`PostEditor` 輸出：

```tsx
<label>
  內容語系
  <select name="locale" defaultValue={source?.locale ?? locale} required>
    {supportedLocales.map((value) => (
      <option key={value} value={value}>{getLocaleConfig(value).label}</option>
    ))}
  </select>
</label>
```

編輯既有已發布文章時將 select 設為 disabled，並以 hidden input 保留原 locale；草稿可更改語系，但 categories 只載入目標語系。若使用者在草稿編輯頁更改語系後尚未重載分類，server action 仍以 Task 2 的複合外鍵拒絕跨語系分類。

- [ ] **Step 4: 更新 Server Actions**

`savePostAction` 與 `createCategoryAction` 使用 `localeSchema.parse(field(formData, "locale"))`。切換文章狀態時傳回 `current.locale`。成功儲存後 revalidate `/admin`、`/${locale}` 及文章/分類公開路徑。

- [ ] **Step 5: 執行後台與 repository 測試**

Run: `npm test -- src/components/admin/post-editor.test.tsx src/app/admin/page.test.tsx src/lib/content/repository.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交後台語系流程**

```bash
git add src/app/admin src/components/admin/post-editor.tsx src/components/admin/post-editor.test.tsx src/app/globals.css
git commit -m "feat: add locale controls to content admin"
```

---

### Task 4: 讓 AI 生成與改寫顯式接收目標語系

**Files:**
- Modify: `src/lib/ai/types.ts`
- Modify: `src/lib/ai/prompt.ts`
- Modify: `src/lib/ai/prompt.test.ts`
- Modify: `src/lib/ai/schema.ts`
- Modify: `src/lib/ai/content-generator.ts`
- Modify: `src/lib/ai/content-generator.test.ts`
- Modify: `src/lib/ai/generate-article.ts`
- Modify: `src/lib/ai/generate-article.test.ts`
- Modify: `src/lib/ai/rewrite-article.ts`
- Modify: `src/lib/ai/rewrite-article.test.ts`
- Modify: `src/app/admin/posts/generate-actions.ts`
- Modify: `src/app/admin/posts/rewrite-actions.ts`
- Modify: `src/components/admin/ai-generator.tsx`
- Modify: `src/components/admin/ai-content-generator.tsx`
- Modify: `src/components/admin/ai-content-generator.test.tsx`
- Modify: `src/components/admin/ai-rewriter.tsx`
- Modify: `src/components/admin/ai-rewriter.test.tsx`

**Interfaces:**
- Consumes: `Locale`、`getLocaleConfig` from Task 1；locale-filtered categories from Task 2。
- Produces: 所有文章生成、來源分析、依選題生成與改寫輸入的 `locale: Locale` 欄位。

- [ ] **Step 1: 先以 prompt 測試固定三種語言要求**

```ts
it.each([
  ["zh-tw", "台灣繁體中文"],
  ["en", "English"],
  ["ja", "日本語"],
] as const)("requests %s output without fallback", (locale, expected) => {
  const prompt = buildArticlePrompt({ locale, topic: "Login", keyword: "login", instructions: "" });
  expect(prompt).toContain(expected);
});
```

生成及改寫測試的 fixture 均加入 `locale`，並驗證 provider 收到對應語言 system prompt。

- [ ] **Step 2: 執行 AI 測試並確認輸入型別或文案失敗**

Run: `npm test -- src/lib/ai/prompt.test.ts src/lib/ai/generate-article.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/content-generator.test.ts`

Expected: FAIL，原因為 `locale` 尚未進入型別或 prompt 仍固定繁體中文。

- [ ] **Step 3: 建立語言指令並串入所有 prompts**

```ts
const languageInstructions: Record<Locale, string> = {
  "zh-tw": "使用台灣繁體中文與台灣慣用語",
  en: "Write in clear, natural English",
  ja: "自然で分かりやすい日本語で書く",
};

export function getLanguageInstruction(locale: Locale): string {
  return languageInstructions[locale];
}
```

`buildArticlePrompt`、`buildRewritePrompt`、`buildAnalyzeSourcePrompt`、`buildGenerateFromIdeaPrompt` 都從輸入 locale 取得指令。provider 預設 system prompt 改為語言中立，呼叫層傳入依 locale 組成的 system prompt。schema description 不再寫死「繁體中文」。

- [ ] **Step 4: 更新 AI 後台表單與分類查詢**

AI 生成與改寫表單顯示相同三語系選擇器；Server Actions 解析 locale，分析選題和產生文章時只傳入相同語系分類，最後儲存草稿時保留 locale。未提供欄位的舊表單請求以 `defaultLocale` 處理，僅作為向後相容邊界。

- [ ] **Step 5: 執行完整 AI 測試群組**

Run: `npm test -- src/lib/ai src/components/admin/ai-content-generator.test.tsx src/components/admin/ai-rewriter.test.tsx src/app/admin/posts/generate/actions.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交 AI 語系支援**

```bash
git add src/lib/ai src/app/admin/posts/generate-actions.ts src/app/admin/posts/rewrite-actions.ts src/components/admin/ai-generator.tsx src/components/admin/ai-content-generator.tsx src/components/admin/ai-content-generator.test.tsx src/components/admin/ai-rewriter.tsx src/components/admin/ai-rewriter.test.tsx
git commit -m "feat: generate AI content in selected locale"
```

---

### Task 5: 建立語言選擇器與語系化網站框架

**Files:**
- Create: `src/components/site/language-switcher.tsx`
- Create: `src/components/site/language-switcher.test.tsx`
- Modify: `src/components/site/header.tsx`
- Modify: `src/components/site/footer.tsx`
- Modify: `src/components/site/article-card.tsx`
- Modify: `src/components/site/breadcrumbs.tsx`
- Modify: `src/components/site/category-page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `Locale`、`supportedLocales`、`getLocaleConfig`、`SiteDictionary` from Task 1；locale-aware repository functions from Task 2。
- Produces: `LanguageSwitcher({ locale })`；所有公開 shell component 的必填 `locale` 與 `dictionary` props。

- [ ] **Step 1: 寫出語言選擇器與語系連結失敗測試**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";

describe("LanguageSwitcher", () => {
  it("marks the current locale and links every other locale home", () => {
    render(<LanguageSwitcher locale="zh-tw" />);
    expect(screen.getByRole("link", { name: "繁體中文" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/ja");
  });
});
```

- [ ] **Step 2: 執行測試並確認元件不存在**

Run: `npm test -- src/components/site/language-switcher.test.tsx`

Expected: FAIL，無法解析 `language-switcher`。

- [ ] **Step 3: 實作純 server-compatible link 選擇器**

```tsx
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <nav className="language-switcher" aria-label={getDictionary(locale).navigation.language}>
      {supportedLocales.map((value) => (
        <Link key={value} href={`/${value}`} aria-current={value === locale ? "page" : undefined}>
          {getLocaleConfig(value).label}
        </Link>
      ))}
    </nav>
  );
}
```

使用一般 `Link`，不使用 client state、localStorage 或 cookie。

- [ ] **Step 4: 將 locale 傳入公開網站框架元件**

所有站內連結前綴 `/${locale}`，日期使用 `getLocaleConfig(locale).dateLocale`。Header 放入語言選擇器；文章、分類與麵包屑不再組出無語系網址。特殊分類維持 `/${locale}/ai`、`/${locale}/software`、`/${locale}/social`，其他分類使用 `/${locale}/category/${slug}`。

- [ ] **Step 5: 加入手機與桌面樣式**

在既有 header responsive rules 中加入 `.language-switcher`：允許橫向排列或換行、保留可點擊高度、`[aria-current="page"]` 有文字或底線狀態、360px 不水平溢出。

- [ ] **Step 6: 執行公開元件測試**

Run: `npm test -- src/components/site/language-switcher.test.tsx src/components/site/article-body.test.tsx`

Expected: PASS。

- [ ] **Step 7: 提交網站框架語系化**

```bash
git add src/components/site src/app/globals.css
git commit -m "feat: add public language switcher"
```

---

### Task 6: 搬移公開路由並建立獨立 root layouts

**Files:**
- Delete: `src/app/layout.tsx`
- Create: `src/app/[locale]/layout.tsx`
- Create: `src/app/(backoffice)/layout.tsx`
- Move: `src/app/(auth)/**` → `src/app/(backoffice)/(auth)/**`
- Move: `src/app/admin/**` → `src/app/(backoffice)/admin/**`
- Move: `src/app/(site)/**` → `src/app/[locale]/(site)/**`
- Move: `src/app/not-found.tsx` → `src/app/[locale]/not-found.tsx`
- Move: `src/app/error.tsx` → `src/app/[locale]/error.tsx`
- Create: `src/app/(backoffice)/error.tsx`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: Task 1 的 locale 驗證及字典；Task 2 的 locale-aware 查詢；Task 5 的公開元件 props。
- Produces: `PageProps<"/[locale]">` 路由參數；`/zh-tw`、`/en`、`/ja` 公開頁；無前綴 backoffice 路由；308 legacy redirects。

- [ ] **Step 1: 先擴充 Playwright 公開路由測試**

```ts
test("根網址與舊網址永久轉址到繁體中文並保留 query", async ({ request }) => {
  const root = await request.get("/?source=bookmark", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(root.headers().location).toBe("/zh-tw?source=bookmark");

  const article = await request.get("/articles/chatgpt-login-guide?ref=old", { maxRedirects: 0 });
  expect(article.status()).toBe(308);
  expect(article.headers().location).toBe("/zh-tw/articles/chatgpt-login-guide?ref=old");
});

test("unsupported locales return 404", async ({ request }) => {
  expect((await request.get("/fr", { maxRedirects: 0 })).status()).toBe(404);
});
```

- [ ] **Step 2: 執行路由測試並確認目前行為不符合**

Run: `npm run test:e2e -- tests/e2e/public-pages.spec.ts`

Expected: FAIL，根網址不是 308 或語系路由不存在。

- [ ] **Step 3: 建立兩個 root layouts**

`src/app/[locale]/layout.tsx` 解析 `params.locale`，未知語系呼叫 `notFound()`，並輸出：

```tsx
export default async function LocaleRootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: candidate } = await params;
  if (!isLocale(candidate)) notFound();
  return (
    <html lang={getLocaleConfig(candidate).htmlLang}>
      <body>{children}</body>
    </html>
  );
}
```

此 layout 的 `generateMetadata` 依 locale 字典建立 title、description、Open Graph locale、manifest 與 icon。`generateStaticParams` 回傳三個支援語系。

`src/app/(backoffice)/layout.tsx` 使用 `<html lang="zh-Hant-TW">`，載入相同 globals CSS，並只包住既有 auth/admin children；既有 `admin/layout.tsx` 仍負責 session 與 AdminNav。

- [ ] **Step 4: 使用 `git mv` 搬移 routes 並修正相對 imports**

移動不改變 `/admin`、`/login` 與 `/change-password` URL。公開頁 props 統一解析 locale、以 `isLocale` 驗證，再傳入查詢及公開元件。公開 not-found 返回 `/${locale}`；backoffice error 保持繁體中文且不依賴 locale。

- [ ] **Step 5: 實作語系首頁與空白狀態**

首頁使用 `hasPublishedPosts(prisma, locale)`。無文章時只顯示字典的 `home.emptyTitle` 和 `home.emptyDescription`；有內容時，分類卡片由該語系且含已發布文章的 Category 資料產生，不保留繁體中文硬編碼分類。`generateMetadata` 加入：

```ts
robots: hasContent ? undefined : { index: false, follow: true }
```

繁體中文有現有文章時維持首頁內容；英文、日文不得查出繁體中文文章。資訊/政策頁只有列在 `getLocaleConfig(locale).publishedInfoPages` 時才渲染該語系正文；尚未提供的版本顯示 `infoUnavailable` 字典內容並輸出 `noindex, follow`，不渲染繁體中文正文。

- [ ] **Step 6: 在 `next.config.ts` 建立明確永久轉址**

```ts
async redirects() {
  return [
    { source: "/", destination: "/zh-tw", permanent: true },
    { source: "/ai", destination: "/zh-tw/ai", permanent: true },
    { source: "/software", destination: "/zh-tw/software", permanent: true },
    { source: "/social", destination: "/zh-tw/social", permanent: true },
    { source: "/articles/:slug", destination: "/zh-tw/articles/:slug", permanent: true },
    { source: "/category/:slug", destination: "/zh-tw/category/:slug", permanent: true },
    { source: "/about", destination: "/zh-tw/about", permanent: true },
    { source: "/contact", destination: "/zh-tw/contact", permanent: true },
    { source: "/privacy", destination: "/zh-tw/privacy", permanent: true },
    { source: "/terms", destination: "/zh-tw/terms", permanent: true },
  ];
}
```

Next.js redirects 自動保留未被 destination 消耗的 query string。不要建立會匹配 `/admin`、系統檔案或已有 locale 的廣泛 matcher。

- [ ] **Step 7: 更新搬移後的單元測試 imports 並執行 route build smoke test**

Run: `npm test -- src/app && npm run build`

Expected: PASS；build route table 同時包含 `/[locale]` 公開頁及無前綴 `/admin`、`/login`。

- [ ] **Step 8: 提交路由重構**

```bash
git add src/app next.config.ts
git commit -m "feat: route public content by locale"
```

---

### Task 7: 語系化 SEO、sitemap、manifest 與廣告路徑

**Files:**
- Modify: `src/lib/seo/metadata.ts`
- Modify: `src/lib/seo/metadata.test.ts`
- Modify: `src/lib/seo/structured-data.ts`
- Modify: `src/lib/seo/structured-data.test.ts`
- Modify: `src/app/sitemap-data.ts`
- Modify: `src/app/sitemap.test.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `src/app/manifest.ts`
- Modify: `src/lib/adsense/config.ts`
- Modify: `src/lib/adsense/config.test.ts`
- Modify: `src/components/site/article-body.test.tsx`

**Interfaces:**
- Consumes: locale config/dictionary from Task 1；locale-aware content query from Task 2；localized routes from Task 6。
- Produces: `buildPostMetadata(post, locale)`、`buildWebsiteJsonLd(siteUrl, locale)`、`buildArticleJsonLd(post, siteUrl, locale)`、`getSitemapContent(client, siteUrl)` 的語系輸出。

- [ ] **Step 1: 先更新 SEO 測試預期**

```ts
const metadata = buildPostMetadata(post, "ja");
expect(metadata.alternates?.canonical).toBe("https://1wiki.example/ja/articles/chatgpt-login");
expect(metadata.openGraph).toMatchObject({ locale: "ja_JP" });

const value = buildArticleJsonLd(post, "https://1wiki.example", "en");
expect(value).toMatchObject({
  url: "https://1wiki.example/en/articles/ai-guide",
  inLanguage: "en",
});
expect(JSON.stringify(value)).not.toContain("hreflang");
```

Sitemap 測試建立 `zh-tw` published、`en` published、`ja` draft，預期只包含 `/zh-tw/...` 與 `/en/...`，不包含 `/ja`。

- [ ] **Step 2: 執行 SEO 與 sitemap 測試並確認舊網址失敗**

Run: `npm test -- src/lib/seo src/app/sitemap.test.ts src/lib/adsense/config.test.ts`

Expected: FAIL，canonical/JSON-LD/sitemap 缺少 locale，AdSense regex 不接受 locale path。

- [ ] **Step 3: 更新 metadata 與 JSON-LD signatures**

所有 URL 使用 `/${locale}/articles/${slug}`，所有 locale 值從 `getLocaleConfig(locale)` 取得。只輸出 self canonical，不加入 `alternates.languages`。網站 JSON-LD URL 指向 `/${locale}`，Organization URL 仍可維持站點根網址。

- [ ] **Step 4: 重寫 sitemap 資料組裝**

一次查詢所有 published posts/categories 的 `locale`，依實際有 published post 的 locale 建立首頁、分類與文章 URL。資訊頁只有在該語系的 `publishedInfoPages` 明確列出時才建立 sitemap entry。空白 locale 不建立任何 sitemap entry；特殊分類 URL 使用短路徑，其餘使用 `/category/`。

```ts
const activeLocales = new Set(posts.map((post) => post.locale));
const localizedContentPaths = ["", "/ai", "/software", "/social"];
```

只為 `activeLocales` 產生內容 paths，並確保分類本身屬於相同 locale；資訊頁另由 `publishedInfoPages` 控制，英文與日文的未提供頁面不得進入 sitemap。

- [ ] **Step 5: 更新 robots、manifest 與 AdSense**

robots 維持允許公開路徑、禁止 backoffice，sitemap 仍為根 `/sitemap.xml`。Manifest 使用繁體中文站名、`lang: "zh-Hant-TW"`、`start_url: "/zh-tw"`。AdSense 判斷改為只接受支援語系文章路徑：

```ts
const localePattern = supportedLocales.join("|");
const articlePathPattern = new RegExp(`^/(?:${localePattern})/articles/[^/]+$`);
```

- [ ] **Step 6: 執行 SEO、sitemap、廣告與文章正文測試**

Run: `npm test -- src/lib/seo src/app/sitemap.test.ts src/lib/adsense/config.test.ts src/components/site/article-body.test.tsx`

Expected: PASS。

- [ ] **Step 7: 提交 SEO 與索引邏輯**

```bash
git add src/lib/seo src/app/sitemap-data.ts src/app/sitemap.test.ts src/app/sitemap.ts src/app/robots.ts src/app/manifest.ts src/lib/adsense/config.ts src/lib/adsense/config.test.ts src/components/site/article-body.test.tsx
git commit -m "feat: localize SEO and sitemap output"
```

---

### Task 8: 完成端對端語系回歸

**Files:**
- Modify: `tests/e2e/global-setup.ts`
- Modify: `tests/e2e/public-pages.spec.ts`
- Modify: `tests/e2e/adsense-disabled.spec.ts`
- Modify: `tests/e2e/admin-auth.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: Tasks 1–7 的完整公開及後台行為。
- Produces: 可重複執行的多語系 production-mode E2E fixture 與驗收測試。

- [ ] **Step 1: 更新 E2E fixture 的 locale**

三個繁體中文分類及既有文章全部加入 `locale: "zh-tw"`。另外建立英文分類但不建立 published 英文文章，以驗證「有分類但沒有發布文章」仍屬空白語系；日文完全無內容。

- [ ] **Step 2: 擴充公開流程測試**

```ts
test("語言選擇器進入獨立空白語系", async ({ page }) => {
  await page.goto("/zh-tw/articles/chatgpt-login-guide");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "Content coming soon" })).toBeVisible();
  await expect(page.getByText("ChatGPT 無法登入怎麼辦？")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.getByRole("link", { name: "日本語" }).click();
  await expect(page.getByRole("heading", { name: "コンテンツを準備中です" })).toBeVisible();
});
```

再加入：繁體中文 canonical；`html[lang="zh-Hant-TW"]`、`html[lang="en"]`、`html[lang="ja"]`；跨語系文章及無已發布文章的分類回傳 404；sitemap 不含 `/en`、`/ja`；舊網址 308 與 Unicode slug；資訊頁非繁中不顯示繁中政策正文、輸出 `noindex` 且不進入 sitemap。

- [ ] **Step 3: 更新 AdSense 與後台 E2E URL**

公開文章測試從 `/articles/...` 改為 `/zh-tw/articles/...`。後台與登入測試保留原 URL，並額外斷言登入後仍為 `/admin`，沒有被加上 `/zh-tw`。

- [ ] **Step 4: 執行 E2E 測試**

Run: `npm run test:e2e`

Expected: 所有測試 PASS，且 dev server log 沒有 hydration、duplicate root layout 或 redirect loop error。

- [ ] **Step 5: 提交端對端回歸**

```bash
git add tests/e2e playwright.config.ts
git commit -m "test: cover locale routing end to end"
```

---

### Task 9: 文件更新與完整驗證

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md` only if implementation reveals an approved design correction
- Modify: `docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md` to check completed steps during execution

**Interfaces:**
- Consumes: Tasks 1–8 的最終命令、URL 與限制。
- Produces: 可供維護者操作的文件及最終驗證紀錄。

- [ ] **Step 1: 更新 README 的公開網址與內容模型**

README 說明：

- 預設公開網址為 `/zh-tw`。
- `/en`、`/ja` 是獨立內容入口。
- 文章與分類由 locale 隔離，不是互譯內容。
- 後台建立內容時需選擇語系。
- 空白語系不進入 sitemap。
- 新增語系需同步設定、字典、測試及必要內容。

保留 `最後更新：2026-09-04`，因實作日期與原文件日期相同。

- [ ] **Step 2: 執行格式與靜態檢查**

Run: `git diff --check && npm run lint`

Expected: PASS，沒有 whitespace error 或 ESLint error。

- [ ] **Step 3: 執行完整單元及整合測試**

Run: `npm test`

Expected: 所有 Vitest 測試 PASS。

- [ ] **Step 4: 驗證 production build**

Run: `npm run build`

Expected: build PASS；route output 包含 `/[locale]`、`/[locale]/articles/[slug]`、`/admin`、`/login`、`/sitemap.xml`、`/robots.txt`、`/ads.txt`。

- [ ] **Step 5: 執行完整端對端測試**

Run: `npm run test:e2e`

Expected: 所有 Playwright 測試 PASS，包含 360、390、768、1280px 語言選擇器及既有 AdSense 關閉狀態。

- [ ] **Step 6: 檢查 migration 與工作區邊界**

Run: `npx prisma validate && git status --short && git diff --stat`

Expected: Prisma schema valid；沒有意外修改不屬於本計畫的檔案；既有使用者變更仍被保留。

- [ ] **Step 7: 提交文件與最終修整**

```bash
git add README.md docs/superpowers/specs/2026-09-04-1wiki-locale-architecture-design.md docs/superpowers/plans/2026-09-04-1wiki-locale-architecture.md
git commit -m "docs: document locale content workflow"
```

- [ ] **Step 8: 準備交付摘要，不進行部署**

交付摘要列出：完成的路由與資料模型、migration 名稱、測試/lint/build/E2E 結果、已知限制（英文及日文仍無正式內容），並再次註明尚未操作 Vercel 或遠端資料庫。
