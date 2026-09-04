# Hierarchical Categories Implementation Plan

最後更新：2026-09-05

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立各語系獨立、最多三級、各層可放文章的分類樹，並將所有公開分類網址統一為完整 `/[locale]/category/[...slugs]` 路徑。

**Architecture:** `Category.parentId` 以同語系複合外鍵建立 adjacency list；純函式模組負責樹狀排序、階層選項與 href，repository 負責 transaction 內的深度、循環、刪除與路徑解析。後台、文章工作流、前台分類頁、Header、metadata 與 sitemap 共用同一份分類階層資料及 URL helper。

**Tech Stack:** Next.js 16.3.4 App Router、React 19.2.8、TypeScript 6.0.3、Prisma 7.10.0、PostgreSQL、Zod 4.5.4、Vitest 5、Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-09-05-hierarchical-categories-design.md`

## Global Constraints

- 分類最多三級，且每個語系的分類樹各自獨立。
- 文章可以放在任一層；父分類頁彙整自身與全部後代的已發布文章。
- 所有分類 canonical URL 必須為 `/[locale]/category/[...slugs]`。
- 不保留 `/[locale]/ai`、`/[locale]/software`、`/[locale]/social` 或任何轉址。
- 有文章或子分類的分類不可刪除。
- 同一語系維持 `slug` 全域唯一。
- 一級分類才能顯示於頂部導覽，順序使用 `sortOrder` 後接名稱。
- 既有分類與文章關聯必須原樣保留；所有既有分類遷移為一級並顯示於導覽。
- 不新增分類頁分頁、拖曳排序、多分類文章或跨語系翻譯綁定。
- 不覆寫工作區中與本功能無關的既有修改；每次提交只暫存該任務列出的檔案。
- 修改 Next.js 程式前先讀 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`、`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`、`node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md` 中與該任務相關的章節。

---

## File Structure

- `prisma/schema.prisma`：分類自關聯、導覽欄位與索引。
- `prisma/migrations/20260905090000_hierarchical_categories/migration.sql`：無資料損失遷移及同語系複合外鍵。
- `src/lib/content/category-tree.ts`：無 I/O 的樹狀排序、縮排選項、階層 URL helper。
- `src/lib/content/category-tree.test.ts`：純函式與一至三級 href 測試。
- `src/lib/content/schema.ts`：分類建立／更新輸入驗證。
- `src/lib/content/repository.ts`：分類 transaction 驗證、祖先／後代、路徑解析與彙整查詢。
- `src/lib/content/repository.test.ts`：資料庫層階層規則與文章彙整測試。
- `src/components/admin/category-manager.tsx`：建立表單、樹狀列表、編輯與刪除控制。
- `src/components/admin/category-manager.test.tsx`：後台分類互動與欄位可見性測試。
- `src/app/(backoffice)/admin/categories/page.tsx`：載入語系分類並交給 manager。
- `src/app/(backoffice)/admin/categories/page.test.tsx`：頁面資料傳遞及成功／錯誤訊息。
- `src/app/(backoffice)/admin/categories/actions.ts`：建立、更新、移動與刪除 actions。
- `src/app/(backoffice)/admin/categories/actions.test.ts`：action 驗證、redirect 與 revalidate 測試。
- `src/components/admin/category-select.tsx`：文章與 AI 工作流共用的階層分類 `<option>`。
- `src/components/admin/category-select.test.tsx`：縮排標籤、語系隔離與任一層可選測試。
- `src/components/admin/post-editor.tsx`、`post-filters.tsx`、`ai-rewriter.tsx`：改用共用分類選項。
- `src/app/(backoffice)/admin/page.tsx` 及文章 new/edit/rewrite/generate actions：查詢 parent 資料並提供完整路徑標籤。
- `src/app/[locale]/(site)/category/[...slugs]/page.tsx`：唯一的公開分類 catch-all route。
- `src/app/[locale]/(site)/category/[slug]/page.tsx`：由 catch-all route 取代並刪除。
- `src/app/[locale]/(site)/ai/page.tsx`、`software/page.tsx`、`social/page.tsx`：刪除，不轉址。
- `src/components/site/category-page.tsx`：分類標頭、子分類卡片與後代文章彙整。
- `src/components/site/category-breadcrumbs.tsx`：分類頁與文章頁共用完整祖先鏈。
- `src/components/site/article-card.tsx`、`breadcrumbs.tsx`、文章 page：使用 canonical 分類 href。
- `src/components/site/header.tsx` 與 site layout：資料驅動頂部導覽。
- `src/app/[locale]/(site)/page.tsx`：只呈現一級分類。
- `src/app/sitemap-data.ts`、`src/lib/seo/structured-data.ts`：階層 sitemap 與 BreadcrumbList JSON-LD。
- `prisma/seed.ts`、`tests/e2e/global-setup.ts`：建立導覽分類與二三級測試資料。
- `tests/e2e/public-pages.spec.ts`：完整公開導覽與舊網址 404。

---

### Task 1: Add the hierarchical category schema and lossless migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260905090000_hierarchical_categories/migration.sql`
- Modify: `prisma/seed.ts`
- Modify: `src/lib/content/schema.ts`
- Modify: `tests/integration/bootstrap-owner.test.ts`

**Interfaces:**
- Produces: Prisma `Category.parentId`, `parent`, `children`, `showInNavigation`, `sortOrder`.
- Produces: `CategoryInput` with `parentId: string | null`, `showInNavigation: boolean`, `sortOrder: number`.

- [ ] **Step 1: Write the failing migration and schema assertions**

Extend `tests/integration/bootstrap-owner.test.ts` so seeded categories prove the new root and navigation fields:

```ts
expect(categories).toEqual(expect.arrayContaining([
  expect.objectContaining({
    slug: "ai",
    parentId: null,
    showInNavigation: true,
    sortOrder: 0,
  }),
]));
expect(categories.every(({ parentId }) => parentId === null)).toBe(true);
expect(categories.every(({ showInNavigation }) => showInNavigation)).toBe(true);
```

Add schema assertions to `src/lib/content/repository.test.ts` through `createCategory` input in Task 2; do not unit-test Zod constants directly.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `npm test -- tests/integration/bootstrap-owner.test.ts`

Expected: FAIL because `parentId`, `showInNavigation`, and `sortOrder` do not exist.

- [ ] **Step 3: Add Prisma fields and migration SQL**

Use this relation shape in `Category`:

```prisma
parentId             String?
showInNavigation     Boolean    @default(false)
sortOrder            Int        @default(0)
parent               Category?  @relation("CategoryTree", fields: [parentId, locale], references: [id, locale], onDelete: Restrict)
children             Category[] @relation("CategoryTree")

@@index([locale, parentId, sortOrder])
```

Migration SQL must add nullable/defaulted columns, make every existing category visible, and add the composite foreign key without changing `Post.categoryId`:

```sql
ALTER TABLE "Category"
  ADD COLUMN "parentId" TEXT,
  ADD COLUMN "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Category" SET "showInNavigation" = true;

CREATE INDEX "Category_locale_parentId_sortOrder_idx"
  ON "Category"("locale", "parentId", "sortOrder");

ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_locale_fkey"
  FOREIGN KEY ("parentId", "locale")
  REFERENCES "Category"("id", "locale")
  ON DELETE RESTRICT ON UPDATE CASCADE;
```

Extend `categoryInputSchema`:

```ts
parentId: z.string().cuid("請選擇有效的上層分類").nullable().default(null),
showInNavigation: z.boolean().default(false),
sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
```

Update every root in `initialCategories` with `showInNavigation: true` and `sortOrder: 0`; omit `parentId` so the database stores `null`.

- [ ] **Step 4: Generate Prisma client and verify GREEN**

Run: `npm run prisma:generate`

Run: `npm test -- tests/integration/bootstrap-owner.test.ts`

Expected: PASS, and Prisma generation exits 0.

- [ ] **Step 5: Commit the schema unit**

```bash
git add prisma/schema.prisma prisma/migrations/20260905090000_hierarchical_categories/migration.sql prisma/seed.ts src/lib/content/schema.ts tests/integration/bootstrap-owner.test.ts
git commit -m "feat: add hierarchical category schema"
```

---

### Task 2: Implement category tree helpers and repository invariants

**Files:**
- Create: `src/lib/content/category-tree.ts`
- Create: `src/lib/content/category-tree.test.ts`
- Modify: `src/lib/content/repository.ts`
- Modify: `src/lib/content/repository.test.ts`

**Interfaces:**
- Produces: `CategoryTreeItem`, `CategoryOption`, `buildCategoryTree`, `flattenCategoryOptions`, `getCategoryHref`.
- Produces: `getCategoryAncestors(client, categoryId)`, `getCategoryDescendantIds(client, categoryId)`, `resolveCategoryPath(client, locale, slugs)`.
- Changes: `createCategory` and `updateCategory` enforce all hierarchy rules inside a Prisma transaction.

- [ ] **Step 1: Write failing pure helper tests**

Create `src/lib/content/category-tree.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCategoryTree, flattenCategoryOptions, getCategoryHref, type CategoryRow } from "./category-tree";

const rows = [
  { id: "root", locale: "zh-tw", name: "AI", slug: "ai", parentId: null, sortOrder: 1, showInNavigation: true, directPostCount: 1 },
  { id: "child", locale: "zh-tw", name: "ChatGPT", slug: "chatgpt", parentId: "root", sortOrder: 0, showInNavigation: false, directPostCount: 2 },
  { id: "leaf", locale: "zh-tw", name: "Prompt", slug: "prompt", parentId: "child", sortOrder: 0, showInNavigation: false, directPostCount: 3 },
] satisfies CategoryRow[];

describe("category tree", () => {
  it("builds ordered nodes with complete segments", () => {
    expect(buildCategoryTree(rows)[0].children[0].children[0].segments).toEqual(["ai", "chatgpt", "prompt"]);
    expect(buildCategoryTree(rows)[0].aggregatePostCount).toBe(6);
  });

  it("orders siblings by sortOrder and then name", () => {
    const siblings = [
      { ...rows[0], id: "software", name: "Software", slug: "software", sortOrder: 2 },
      { ...rows[0], id: "ai", name: "AI", slug: "ai", sortOrder: 1 },
    ];
    expect(buildCategoryTree(siblings).map(({ name }) => name)).toEqual(["AI", "Software"]);
  });

  it("formats selectable labels for every level", () => {
    expect(flattenCategoryOptions(buildCategoryTree(rows)).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "root", label: "AI" },
      { id: "child", label: "— ChatGPT" },
      { id: "leaf", label: "—— Prompt" },
    ]);
  });

  it("builds one canonical href shape", () => {
    expect(getCategoryHref("zh-tw", ["ai", "chatgpt", "prompt"])).toBe("/zh-tw/category/ai/chatgpt/prompt");
  });

  it("rejects orphaned and cyclic rows", () => {
    expect(() => buildCategoryTree([{ ...rows[1], parentId: "missing" }])).toThrow("分類資料包含無效的父子關係");
    expect(() => buildCategoryTree([
      { ...rows[0], id: "a", parentId: "b" },
      { ...rows[1], id: "b", parentId: "a" },
    ])).toThrow("分類資料包含無效的父子關係");
  });
});
```

- [ ] **Step 2: Run helper tests and verify RED**

Run: `npm test -- src/lib/content/category-tree.test.ts`

Expected: FAIL because `category-tree.ts` does not exist.

- [ ] **Step 3: Implement the pure helper API**

Define exact exported types and functions:

```ts
export type CategoryRow = {
  id: string;
  locale: Locale;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  showInNavigation: boolean;
  directPostCount: number;
};

export type CategoryTreeItem = {
  id: string;
  locale: Locale;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  showInNavigation: boolean;
  directPostCount: number;
  aggregatePostCount: number;
  depth: 1 | 2 | 3;
  segments: string[];
  children: CategoryTreeItem[];
};

export type CategoryOption = {
  id: string;
  locale: Locale;
  label: string;
  depth: 1 | 2 | 3;
  segments: string[];
};

export function buildCategoryTree(rows: CategoryRow[]): CategoryTreeItem[];
export function flattenCategoryOptions(tree: CategoryTreeItem[]): CategoryOption[];
export function getCategoryHref(locale: Locale, segments: string[]): string;
```

Sort each sibling group by `sortOrder` ascending and `name` using `localeCompare`; throw `分類資料包含無效的父子關係` for orphaned or cyclic input instead of silently dropping rows.

- [ ] **Step 4: Verify helper GREEN**

Run: `npm test -- src/lib/content/category-tree.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 5: Write failing repository hierarchy tests**

Add separate tests to `repository.test.ts` for these observable failures and queries:

```ts
await expect(createCategory(prisma, {
  locale: "en", name: "Wrong locale", slug: "wrong-locale",
  description: "", parentId: zhRoot.id, showInNavigation: false, sortOrder: 0,
})).rejects.toThrow("上層分類必須與目前分類使用相同語系");

await expect(createCategory(prisma, {
  locale: "zh-tw", name: "Level four", slug: "level-four",
  description: "", parentId: levelThree.id, showInNavigation: false, sortOrder: 0,
})).rejects.toThrow("分類最多只能有三級");

await expect(updateCategory(prisma, root.id, {
  locale: "zh-tw", name: "AI", slug: "ai", description: "",
  parentId: leaf.id, showInNavigation: false, sortOrder: 0,
})).rejects.toThrow("分類不能移到自己或自己的子分類下");

await expect(deleteCategory(prisma, root.id)).rejects.toThrow("分類仍有子分類");
await expect(getCategoryDescendantIds(prisma, root.id)).resolves.toEqual(expect.arrayContaining([root.id, child.id, leaf.id]));
await expect(resolveCategoryPath(prisma, "zh-tw", ["ai", "chatgpt", "prompt"])).resolves.toMatchObject({ id: leaf.id });
await expect(resolveCategoryPath(prisma, "zh-tw", ["chatgpt", "ai"])).resolves.toBeNull();
```

- [ ] **Step 6: Run repository tests and verify RED**

Run: `npm test -- src/lib/content/repository.test.ts`

Expected: FAIL because the new hierarchy signatures and guards are absent.

- [ ] **Step 7: Implement repository hierarchy behavior**

Implement these signatures:

```ts
export async function getCategoryAncestors(client: PrismaClient, categoryId: string): Promise<Category[]>;
export async function getCategoryDescendantIds(client: PrismaClient, categoryId: string): Promise<string[]>;
export async function resolveCategoryPath(client: PrismaClient, locale: Locale, slugs: string[]): Promise<Category | null>;
```

Use at most three parent/child reads; do not add recursive SQL for a fixed three-level tree. `createCategory` and `updateCategory` must call a shared `validateCategoryPlacement` inside `client.$transaction`. `deleteCategory` must query both `_count.posts` and `_count.children`; remove `protectedCategorySlugs` entirely. When a category becomes a child, persist `showInNavigation: false`.

- [ ] **Step 8: Verify repository GREEN and commit**

Run: `npm test -- src/lib/content/category-tree.test.ts src/lib/content/repository.test.ts`

Expected: all tests PASS.

```bash
git add src/lib/content/category-tree.ts src/lib/content/category-tree.test.ts src/lib/content/repository.ts src/lib/content/repository.test.ts
git commit -m "feat: enforce category hierarchy rules"
```

---

### Task 3: Build the category administration tree and server actions

**Files:**
- Create: `src/components/admin/category-manager.tsx`
- Create: `src/components/admin/category-manager.test.tsx`
- Modify: `src/app/(backoffice)/admin/categories/page.tsx`
- Create: `src/app/(backoffice)/admin/categories/page.test.tsx`
- Modify: `src/app/(backoffice)/admin/categories/actions.ts`
- Create: `src/app/(backoffice)/admin/categories/actions.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `CategoryTreeItem`, `buildCategoryTree`, `flattenCategoryOptions`, `getCategoryHref` from Task 2.
- Produces: `CategoryManager({ locale, categories, feedback })`.
- Produces: `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction` with locale-preserving redirects.

- [ ] **Step 1: Write failing manager component tests**

Create `category-manager.test.tsx` with real component behavior:

```tsx
render(<CategoryManager locale="zh-tw" categories={tree} feedback={null} />);
expect(screen.getByText("AI")).toBeInTheDocument();
expect(screen.getByText("/zh-tw/category/ai/chatgpt")).toBeInTheDocument();
expect(screen.getByRole("option", { name: "— ChatGPT" })).toBeInTheDocument();
expect(screen.queryByRole("option", { name: "—— Prompt" })).not.toBeInTheDocument();

fireEvent.change(screen.getByLabelText("上層分類"), { target: { value: "child" } });
expect(screen.queryByLabelText("顯示於頂部導覽")).not.toBeInTheDocument();

expect(screen.getByRole("button", { name: "刪除 AI" })).toBeDisabled();
expect(screen.getByText("分類仍有子分類，無法刪除")).toBeInTheDocument();
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- src/components/admin/category-manager.test.tsx`

Expected: FAIL because `CategoryManager` does not exist.

- [ ] **Step 3: Implement the manager UI**

Make `category-manager.tsx` a Client Component. Render one create form plus nested rows. Use hidden `locale`, checkbox `showInNavigation`, numeric `sortOrder`, and one `<details>` edit form per row. Parent candidates exclude depth 3; edit candidates also exclude the edited node and descendants. The URL warning text must be exactly `修改網址代稱或上層分類會改變此分類及子分類的公開網址。`.

Expose disabled delete reasons from real counts:

```ts
const deleteReason = category.directPostCount > 0
  ? "分類仍有文章，無法刪除"
  : category.children.length > 0
    ? "分類仍有子分類，無法刪除"
    : null;
```

- [ ] **Step 4: Verify manager GREEN**

Run: `npm test -- src/components/admin/category-manager.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing page and action tests**

Page test must assert selected locale and tree props. Action tests must mock authentication, repository, `revalidatePath`, and `redirect`, then assert concrete calls:

```ts
expect(createCategory).toHaveBeenCalledWith(expect.anything(), {
  locale: "zh-tw",
  name: "ChatGPT",
  slug: "chatgpt",
  description: "對話式 AI",
  parentId: "cm123456789012345678901234",
  showInNavigation: false,
  sortOrder: 2,
});
expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
```

Also assert redirects retain `locale=zh-tw` and use `success=created|updated|deleted` or encoded `error`.

- [ ] **Step 6: Run page/action tests and verify RED**

Run: `npm test -- 'src/app/(backoffice)/admin/categories/page.test.tsx' 'src/app/(backoffice)/admin/categories/actions.test.ts'`

Expected: FAIL because page props and update action are absent.

- [ ] **Step 7: Wire page, actions, feedback, and styles**

`page.tsx` loads `listCategories(prisma, locale)`, builds the tree, and maps query state to:

```ts
type CategoryFeedback =
  | { kind: "success"; message: "分類已建立。" | "分類已更新。" | "分類已刪除。" }
  | { kind: "error"; message: string }
  | null;
```

Parse checkbox and numeric fields explicitly in actions:

```ts
showInNavigation: formData.get("showInNavigation") === "on",
sortOrder: Number(formData.get("sortOrder") || 0),
parentId: String(formData.get("parentId") || "") || null,
```

After mutations call `revalidatePath("/", "layout")` so public Header, home, category pages, and sitemap do not retain stale category data.

- [ ] **Step 8: Verify admin GREEN and commit**

Run: `npm test -- src/components/admin/category-manager.test.tsx 'src/app/(backoffice)/admin/categories/page.test.tsx' 'src/app/(backoffice)/admin/categories/actions.test.ts'`

Expected: all tests PASS.

```bash
git add src/components/admin/category-manager.tsx src/components/admin/category-manager.test.tsx 'src/app/(backoffice)/admin/categories/page.tsx' 'src/app/(backoffice)/admin/categories/page.test.tsx' 'src/app/(backoffice)/admin/categories/actions.ts' 'src/app/(backoffice)/admin/categories/actions.test.ts' src/app/globals.css
git commit -m "feat: manage category trees in admin"
```

---

### Task 4: Reuse hierarchical category options across article and AI workflows

**Files:**
- Create: `src/components/admin/category-select.tsx`
- Create: `src/components/admin/category-select.test.tsx`
- Modify: `src/components/admin/post-editor.tsx`
- Modify: `src/components/admin/post-editor.test.tsx`
- Modify: `src/components/admin/post-filters.tsx`
- Create: `src/components/admin/post-filters.test.tsx`
- Modify: `src/components/admin/ai-rewriter.tsx`
- Modify: `src/components/admin/ai-rewriter.test.tsx`
- Modify: `src/app/(backoffice)/admin/page.tsx`
- Modify: `src/app/(backoffice)/admin/page.test.tsx`
- Modify: `src/app/(backoffice)/admin/posts/new/page.tsx`
- Modify: `src/app/(backoffice)/admin/posts/[id]/page.tsx`
- Modify: `src/app/(backoffice)/admin/posts/rewrite/page.tsx`
- Modify: `src/app/(backoffice)/admin/posts/generate/actions.ts`
- Modify: `src/app/(backoffice)/admin/posts/generate/actions.test.ts`

**Interfaces:**
- Consumes: `CategoryOption` and `flattenCategoryOptions` from Task 2.
- Produces: `CategorySelect({ name, locale, categories, value, includeAll })`.
- Changes: AI category names use full labels while IDs remain unchanged.

- [ ] **Step 1: Write failing shared select tests**

```tsx
render(<CategorySelect name="categoryId" locale="zh-tw" categories={options} value="leaf" />);
expect(screen.getByRole("option", { name: "AI" })).toBeEnabled();
expect(screen.getByRole("option", { name: "— ChatGPT" })).toBeEnabled();
expect(screen.getByRole("option", { name: "—— Prompt" })).toBeEnabled();
expect(screen.queryByRole("option", { name: "Software" })).not.toBeInTheDocument();
expect(screen.getByRole("combobox")).toHaveValue("leaf");
```

- [ ] **Step 2: Run select tests and verify RED**

Run: `npm test -- src/components/admin/category-select.test.tsx`

Expected: FAIL because the shared select does not exist.

- [ ] **Step 3: Implement `CategorySelect` and verify its focused test**

Use this prop contract:

```ts
type CategorySelectProps = {
  name: "category" | "categoryId";
  locale: Locale | "";
  categories: CategoryOption[];
  value?: string;
  includeAll?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
};
```

Render options filtered by `locale`, preserve the provided `value`, emit `onChange(event.currentTarget.value)`, and use `全部分類` only when `includeAll` is true.

Run: `npm test -- src/components/admin/category-select.test.tsx`

Expected: PASS.

- [ ] **Step 4: Write failing consumer tests**

Before each consumer edit, change fixtures to include a root, child, leaf, and other-locale category. Assert the exact indented labels and locale filtering.

- [ ] **Step 5: Run consumer tests and verify RED**

Run: `npm test -- src/components/admin/category-select.test.tsx src/components/admin/post-editor.test.tsx src/components/admin/post-filters.test.tsx src/components/admin/ai-rewriter.test.tsx 'src/app/(backoffice)/admin/page.test.tsx' 'src/app/(backoffice)/admin/posts/generate/actions.test.ts'`

Expected: FAIL because the consumers still render flat category names.

- [ ] **Step 6: Adopt the shared hierarchy options**

Replace duplicated flat option rendering in Post Editor and Post Filters. Pass category rows with `parentId`, `slug`, `sortOrder`, and direct counts from all listed server pages. For AI generation, send `{ id, name: option.label }` so prompts see full hierarchy while the model response remains `categoryId`.

- [ ] **Step 7: Verify consumer GREEN and commit**

Run: `npm test -- src/components/admin/category-select.test.tsx src/components/admin/post-editor.test.tsx src/components/admin/post-filters.test.tsx src/components/admin/ai-rewriter.test.tsx 'src/app/(backoffice)/admin/page.test.tsx' 'src/app/(backoffice)/admin/posts/generate/actions.test.ts'`

Expected: all tests PASS.

```bash
git add src/components/admin/category-select.tsx src/components/admin/category-select.test.tsx src/components/admin/post-editor.tsx src/components/admin/post-editor.test.tsx src/components/admin/post-filters.tsx src/components/admin/post-filters.test.tsx src/components/admin/ai-rewriter.tsx src/components/admin/ai-rewriter.test.tsx 'src/app/(backoffice)/admin/page.tsx' 'src/app/(backoffice)/admin/page.test.tsx' 'src/app/(backoffice)/admin/posts/new/page.tsx' 'src/app/(backoffice)/admin/posts/[id]/page.tsx' 'src/app/(backoffice)/admin/posts/rewrite/page.tsx' 'src/app/(backoffice)/admin/posts/generate/actions.ts' 'src/app/(backoffice)/admin/posts/generate/actions.test.ts'
git commit -m "feat: use category trees in article workflows"
```

---

### Task 5: Replace public category routes with the canonical catch-all route

**Files:**
- Create: `src/app/[locale]/(site)/category/[...slugs]/page.tsx`
- Create: `src/app/[locale]/(site)/category/[...slugs]/page.test.tsx`
- Delete: `src/app/[locale]/(site)/category/[slug]/page.tsx`
- Delete: `src/app/[locale]/(site)/ai/page.tsx`
- Delete: `src/app/[locale]/(site)/software/page.tsx`
- Delete: `src/app/[locale]/(site)/social/page.tsx`
- Modify: `src/components/site/category-page.tsx`
- Create: `src/components/site/category-page.test.tsx`
- Create: `src/components/site/category-breadcrumbs.tsx`
- Create: `src/components/site/category-breadcrumbs.test.tsx`
- Modify: `src/components/site/article-card.tsx`
- Create: `src/components/site/article-card.test.tsx`
- Modify: `src/components/site/breadcrumbs.tsx`
- Modify: `src/app/[locale]/(site)/articles/[slug]/page.tsx`
- Modify: `src/lib/content/repository.ts`
- Modify: `src/lib/content/repository.test.ts`

**Interfaces:**
- Consumes: `resolveCategoryPath`, `getCategoryAncestors`, `getCategoryDescendantIds`, `getCategoryHref`.
- Produces: `getPublishedCategoryTreePage(client, locale, slugs)` returning `{ category, ancestors, children, posts } | null`.
- Produces: `CategoryBreadcrumbs({ locale, ancestors, current, articleTitle? })`.

- [ ] **Step 1: Write failing repository aggregation test**

```ts
const result = await getPublishedCategoryTreePage(prisma, "zh-tw", ["ai"]);
expect(result?.children).toEqual([expect.objectContaining({ id: child.id })]);
expect(result?.posts.map((post) => post.id)).toEqual([leafPost.id, childPost.id, rootPost.id]);
expect(result?.ancestors).toEqual([]);
```

Use distinct `publishedAt` values so expected ordering is literal. Add a leaf lookup assertion with ancestors `[root, child]` and invalid chain returning `null`.

- [ ] **Step 2: Run repository test and verify RED**

Run: `npm test -- src/lib/content/repository.test.ts`

Expected: FAIL because `getPublishedCategoryTreePage` is absent.

- [ ] **Step 3: Implement the public category query**

Resolve the category first, obtain descendant IDs including itself, and query:

```ts
where: {
  locale,
  status: "PUBLISHED",
  categoryId: { in: descendantIds },
},
orderBy: { publishedAt: "desc" },
```

Load only direct children for cards and complete ancestors for breadcrumbs. Return `null` when the resolved category has neither published descendant posts nor visible child content.

- [ ] **Step 4: Write failing route and component tests**

Assert:

```tsx
expect(screen.getByRole("link", { name: "ChatGPT" })).toHaveAttribute("href", "/zh-tw/category/ai/chatgpt");
expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
expect(screen.getByText("Leaf article")).toBeInTheDocument();
```

Route test must call the catch-all page with `params: Promise.resolve({ locale: "zh-tw", slugs: ["ai", "chatgpt"] })` and verify repository arguments. Metadata test must expect canonical `/zh-tw/category/ai/chatgpt`.

- [ ] **Step 5: Run route/component tests and verify RED**

Run: `npm test -- 'src/app/[locale]/(site)/category/[...slugs]/page.test.tsx' src/components/site/category-page.test.tsx src/components/site/category-breadcrumbs.test.tsx src/components/site/article-card.test.tsx`

Expected: FAIL because the catch-all route and canonical-link components are absent.

- [ ] **Step 6: Implement route, components, and remove legacy routes**

Read the local dynamic route guide named in Global Constraints. Use `params: Promise<{ locale: string; slugs: string[] }>` and reject `slugs.length < 1 || slugs.length > 3`. Generate metadata from the same resolved result and `getCategoryHref`. Delete all four old route files; do not add redirects.

Update article queries so `post.category` includes enough parent data to build the full ancestor chain. Replace `breadcrumbs.tsx` with the shared `CategoryBreadcrumbs` contract or make it a thin wrapper without fixed-slug checks.

- [ ] **Step 7: Verify public routing GREEN and commit**

Run: `npm test -- src/lib/content/repository.test.ts 'src/app/[locale]/(site)/category/[...slugs]/page.test.tsx' src/components/site/category-page.test.tsx src/components/site/category-breadcrumbs.test.tsx src/components/site/article-card.test.tsx`

Expected: all tests PASS.

```bash
git add src/lib/content/repository.ts src/lib/content/repository.test.ts 'src/app/[locale]/(site)/category/[...slugs]/page.tsx' 'src/app/[locale]/(site)/category/[...slugs]/page.test.tsx' 'src/app/[locale]/(site)/category/[slug]/page.tsx' 'src/app/[locale]/(site)/ai/page.tsx' 'src/app/[locale]/(site)/software/page.tsx' 'src/app/[locale]/(site)/social/page.tsx' src/components/site/category-page.tsx src/components/site/category-page.test.tsx src/components/site/category-breadcrumbs.tsx src/components/site/category-breadcrumbs.test.tsx src/components/site/article-card.tsx src/components/site/article-card.test.tsx src/components/site/breadcrumbs.tsx 'src/app/[locale]/(site)/articles/[slug]/page.tsx'
git commit -m "feat: route hierarchical category pages"
```

---

### Task 6: Drive Header and home categories from root category data

**Files:**
- Modify: `src/app/[locale]/(site)/layout.tsx`
- Modify: `src/components/site/header.tsx`
- Create: `src/components/site/header.test.tsx`
- Modify: `src/app/[locale]/(site)/page.tsx`
- Create: `src/app/[locale]/(site)/page.test.tsx`
- Modify: `src/lib/content/repository.ts`
- Modify: `src/lib/content/repository.test.ts`
- Modify: `src/lib/i18n/dictionaries.ts`
- Modify: `src/lib/i18n/dictionaries.test.ts`

**Interfaces:**
- Produces: `listNavigationCategories(client, locale)`.
- Produces: `listPublishedRootCategories(client, locale)` with descendant published counts.
- Changes: `SiteHeader({ locale, dictionary, categories })` where categories contain `name` and `segments`.

- [ ] **Step 1: Write failing navigation and root-list repository tests**

```ts
await expect(listNavigationCategories(prisma, "zh-tw")).resolves.toMatchObject([
  { name: "AI", parentId: null, showInNavigation: true },
  { name: "軟體", parentId: null, showInNavigation: true },
]);
await expect(listPublishedRootCategories(prisma, "zh-tw")).resolves.toMatchObject([
  { id: root.id, publishedPostCount: 2 },
]);
```

Fixtures must include a selected child that is ignored by navigation and a root with only a published grandchild that is still returned on home.

- [ ] **Step 2: Run repository tests and verify RED**

Run: `npm test -- src/lib/content/repository.test.ts`

Expected: FAIL because both queries are absent.

- [ ] **Step 3: Implement navigation and root queries**

`listNavigationCategories` filters `{ locale, parentId: null, showInNavigation: true }` and orders by `sortOrder`, then `name`. `listPublishedRootCategories` builds the three-level tree, computes descendant IDs per root, and returns only roots with at least one published descendant post.

- [ ] **Step 4: Write failing Header and home tests**

```tsx
render(<SiteHeader locale="zh-tw" dictionary={dictionary} categories={navigation} />);
expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");
expect(screen.queryByRole("link", { name: "軟體" })).not.toBeInTheDocument();
```

Home page test must assert a child category is not rendered as a top-level card while its root card links to `/zh-tw/category/ai`.

- [ ] **Step 5: Run UI tests and verify RED**

Run: `npm test -- src/components/site/header.test.tsx 'src/app/[locale]/(site)/page.test.tsx'`

Expected: FAIL because Header remains dictionary-hardcoded and home lists all categories.

- [ ] **Step 6: Wire data-driven layout and home**

Load navigation categories in the site layout and pass them to Header. Remove `navigation.ai`, `navigation.software`, and `navigation.social` from every dictionary and its type; keep `primary`, `language`, and `admin`. Render only repository-provided root categories on home.

- [ ] **Step 7: Verify Header/home GREEN and commit**

Run: `npm test -- src/lib/content/repository.test.ts src/components/site/header.test.tsx 'src/app/[locale]/(site)/page.test.tsx' src/lib/i18n/dictionaries.test.ts`

Expected: all tests PASS.

```bash
git add src/lib/content/repository.ts src/lib/content/repository.test.ts 'src/app/[locale]/(site)/layout.tsx' src/components/site/header.tsx src/components/site/header.test.tsx 'src/app/[locale]/(site)/page.tsx' 'src/app/[locale]/(site)/page.test.tsx' src/lib/i18n/dictionaries.ts src/lib/i18n/dictionaries.test.ts
git commit -m "feat: drive site navigation from categories"
```

---

### Task 7: Emit canonical hierarchical sitemap and breadcrumb structured data

**Files:**
- Modify: `src/app/sitemap-data.ts`
- Modify: `src/app/sitemap.test.ts`
- Modify: `src/lib/seo/structured-data.ts`
- Modify: `src/lib/seo/structured-data.test.ts`
- Modify: `src/components/site/category-page.tsx`
- Modify: `src/app/[locale]/(site)/articles/[slug]/page.tsx`

**Interfaces:**
- Consumes: `buildCategoryTree`, `getCategoryHref`, complete ancestor chains.
- Produces: `buildBreadcrumbJsonLd(items, siteUrl)`.

- [ ] **Step 1: Write failing sitemap hierarchy test**

Create root/child/leaf categories and one published leaf post, then assert exact URLs:

```ts
expect(urls).toContain("https://1wiki.example/zh-tw/category/ai");
expect(urls).toContain("https://1wiki.example/zh-tw/category/ai/chatgpt");
expect(urls).toContain("https://1wiki.example/zh-tw/category/ai/chatgpt/prompt");
expect(urls).not.toContain("https://1wiki.example/zh-tw/ai");
```

- [ ] **Step 2: Write failing BreadcrumbList test**

```ts
expect(buildBreadcrumbJsonLd([
  { name: "首頁", href: "/zh-tw" },
  { name: "AI", href: "/zh-tw/category/ai" },
  { name: "ChatGPT", href: "/zh-tw/category/ai/chatgpt" },
], "https://1wiki.example")).toMatchObject({
  "@type": "BreadcrumbList",
  itemListElement: [
    { position: 1, name: "首頁", item: "https://1wiki.example/zh-tw" },
    { position: 2, name: "AI", item: "https://1wiki.example/zh-tw/category/ai" },
    { position: 3, name: "ChatGPT", item: "https://1wiki.example/zh-tw/category/ai/chatgpt" },
  ],
});
```

- [ ] **Step 3: Run SEO tests and verify RED**

Run: `npm test -- src/app/sitemap.test.ts src/lib/seo/structured-data.test.ts`

Expected: FAIL with flat URLs and missing `buildBreadcrumbJsonLd`.

- [ ] **Step 4: Implement sitemap and structured data**

Build the category tree per active locale, include a category when its subtree has at least one published post, and emit each full `segments` path through `getCategoryHref`. Implement `BreadcrumbList` with one-based positions and absolute URLs. Render it through `JsonLd` on category and article pages using the same visual breadcrumb items.

- [ ] **Step 5: Verify SEO GREEN and commit**

Run: `npm test -- src/app/sitemap.test.ts src/lib/seo/structured-data.test.ts 'src/app/[locale]/(site)/category/[...slugs]/page.test.tsx'`

Expected: all tests PASS.

```bash
git add src/app/sitemap-data.ts src/app/sitemap.test.ts src/lib/seo/structured-data.ts src/lib/seo/structured-data.test.ts src/components/site/category-page.tsx 'src/app/[locale]/(site)/articles/[slug]/page.tsx' 'src/app/[locale]/(site)/category/[...slugs]/page.test.tsx'
git commit -m "feat: add hierarchical category SEO"
```

---

### Task 8: Update fixtures and verify the complete story

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `tests/e2e/global-setup.ts`
- Modify: `tests/e2e/public-pages.spec.ts`
- Modify: `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Consumes: all public and admin behavior from Tasks 1–7.
- Produces: repeatable E2E evidence for creation, navigation, aggregation, and legacy-route removal.

- [ ] **Step 1: Write failing E2E scenarios**

Add scenarios with these exact outcomes:

```ts
await page.goto("/zh-tw/category/ai/chatgpt/prompt");
await expect(page.getByRole("heading", { name: "Prompt 撰寫" })).toBeVisible();
await expect(page.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/zh-tw/category/ai");

await page.goto("/zh-tw/category/ai");
await expect(page.getByRole("heading", { name: "Leaf article" })).toBeVisible();

const legacyResponse = await page.goto("/zh-tw/ai");
expect(legacyResponse?.status()).toBe(404);
```

Admin scenario logs in, creates `AI → ChatGPT → Prompt 撰寫`, confirms the fourth-level parent is unavailable, and verifies a root with children cannot be deleted.

- [ ] **Step 2: Run E2E tests and verify RED**

Run: `npm run test:e2e -- tests/e2e/public-pages.spec.ts tests/e2e/admin-auth.spec.ts`

Expected: FAIL until fixtures and final wiring support the hierarchy.

- [ ] **Step 3: Update seed and E2E fixtures**

Seed every locale independently. Set initial root categories to `showInNavigation: true`; create at least one zh-tw child and grandchild using returned IDs. Ensure E2E cleanup deletes Posts before Categories so `Restrict` relations do not fail.

- [ ] **Step 4: Run focused and full automated verification**

Run: `npm run prisma:generate`

Run: `npm test`

Expected: all Vitest files and tests PASS with zero failures.

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

Run: `npm run build`

Expected: exit 0; route output contains `/[locale]/category/[...slugs]` and does not contain dedicated `/[locale]/ai`, `/software`, or `/social` routes.

Run: `npm run test:e2e -- tests/e2e/public-pages.spec.ts tests/e2e/admin-auth.spec.ts`

Expected: both E2E files PASS.

- [ ] **Step 5: Perform browser verification on desktop and mobile**

At `http://localhost:3000/admin/categories`, verify:

1. The selected locale owns an independent tree.
2. Creating first-, second-, and third-level categories shows correct indentation and URL preview.
3. A fourth-level parent cannot be selected.
4. Editing parent/slug displays the URL-change warning.
5. Categories with posts or children have disabled deletion and a visible reason.

At public routes, verify Header ordering, child cards, aggregate articles, visual breadcrumbs, canonical links, no Next.js error overlay, and no console errors at desktop and 390px viewport widths.

- [ ] **Step 6: Review diffs and commit final fixtures**

Run: `git diff --check`

Run: `git status --short`

Confirm unrelated pre-existing changes are not staged.

```bash
git add prisma/seed.ts tests/e2e/global-setup.ts tests/e2e/public-pages.spec.ts tests/e2e/admin-auth.spec.ts
git commit -m "test: verify hierarchical category flows"
```

- [ ] **Step 7: Request final code review**

Use `superpowers:requesting-code-review` against the complete branch diff. Resolve all correctness findings, then rerun Task 8 Step 4 and Step 5 before claiming completion.
