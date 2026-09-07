# 1Wiki 品牌與搜尋呈現設定 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 OWNER 能管理 1Wiki 的共用品牌資產與三個既有語言的首頁 SEO，並安全地把設定輸出為公開 favicon、metadata、JSON-LD 與 manifest。

**Architecture:** 以 `BrandSeoSettings` singleton 與以 locale 為主鍵的 `LocaleSeoSettings` 儲存設定；`src/lib/brand-seo/` 負責解析、驗證與 fallback。OWNER-only 後台 action 和上傳 endpoint 寫入資料，公開 layout、manifest、JSON-LD 和固定 `/brand/*` route 都從同一 repository 消費解析後結果。

**Tech Stack:** Next.js App Router、TypeScript、Prisma/PostgreSQL、Zod、Vitest、React、Cloudflare R2／AWS S3 presigned URL、Sharp。

**Spec:** `docs/superpowers/specs/2026-09-07-brand-seo-settings-design.md`

## Global Constraints

- 每次修改 Next.js 檔案前，先讀取對應 `node_modules/next/dist/docs/` 指引並遵守此專案目前 Next.js 版本的 convention。
- 語言來源只能是 `src/lib/i18n/config.ts` 的 `supportedLocales = ["zh-tw", "en", "ja"]`；不得建立後台語言管理。
- 三個語言是獨立內容站；不得新增 `hreflang`、翻譯關聯、跨語言 slug 對應或自動翻譯。
- 所有品牌／SEO 寫入和品牌資產上傳均限 `OWNER`；公開讀取必須在無設定或資產失敗時回退，不能回傳 500。
- 文字欄位以純文字處理；資產僅可由 OWNER 專用 `uploads/brand/` 簽名流程取得，單檔最大 10 MB。
- 空白語系仍由既有內容狀態輸出 `noindex, follow`；填入 locale SEO 不可改變這個規則。
- 每個 task 先寫失敗測試、確認失敗，再寫最小實作；只提交該 task 的檔案。

---

## File Structure

| 檔案 | 責任 |
| --- | --- |
| `prisma/schema.prisma`、`prisma/migrations/20260907130000_add_brand_seo_settings/migration.sql` | 品牌 singleton 與每語言 SEO 設定資料表。 |
| `src/lib/brand-seo/constants.ts` | singleton id、公開穩定資產路徑、欄位長度與預設資產路徑。 |
| `src/lib/brand-seo/schema.ts` | 將 FormData／API payload 正規化成強型別設定並驗證字串與已核發的 asset URL。 |
| `src/lib/brand-seo/repository.ts` | 從 Prisma 讀取設定，產生 `ResolvedBrandSeo`，並在讀取失敗時回退。 |
| `src/lib/brand-seo/assets.ts` | 驗證實際上傳檔的 MIME、尺寸、正方形 icon 與 OG 最低尺寸。 |
| `src/lib/brand-seo/uploads.ts` | 產生 OWNER 品牌資產的 R2 object key／public URL 與 presigned upload command。 |
| `src/app/api/admin/brand-seo/uploads/route.ts` | OWNER-only 上傳簽名 endpoint。 |
| `src/app/brand/[asset]/route.ts` | 穩定公開 asset URL，串流已驗證 R2 來源或 fallback。 |
| `src/app/(backoffice)/admin/brand-seo/{page,actions}.tsx` | OWNER-only 設定頁與單一原子儲存 action。 |
| `src/components/admin/brand-seo-form.tsx` | 保留未儲存語言分頁輸入、上傳、預覽與欄位錯誤的 client form。 |
| `src/app/[locale]/layout.tsx`、`src/app/manifest.ts`、`src/lib/seo/{metadata,structured-data}.ts` | 消費解析後品牌／locale SEO。 |
| 相鄰 `*.test.ts(x)` 與 SEO 文件 | unit、route、action、UI、公開 metadata regression 與部署紀錄。 |

### Task 1: Prisma 結構、常數與解析 repository

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260907130000_add_brand_seo_settings/migration.sql`
- Create: `src/lib/brand-seo/constants.ts`
- Create: `src/lib/brand-seo/repository.ts`
- Test: `src/lib/brand-seo/repository.test.ts`

**Interfaces:**
- Produces `BRAND_SEO_SETTINGS_ID = "default"`, `brandAssetPaths`, `resolveBrandSeo(prismaClient)`, and `getBrandAssetSource(asset, prismaClient)`.
- `ResolvedBrandSeo` is `{ siteName, alternateNames, assets, locales }`; `locales` is `Record<Locale, { homeTitle, homeDescription, ogTitle, ogDescription }>`.

- [ ] **Step 1: Write the failing repository tests**

```ts
it("returns code defaults when settings rows do not exist", async () => {
  prisma.brandSeoSettings.findUnique.mockResolvedValue(null);
  prisma.localeSeoSettings.findMany.mockResolvedValue([]);
  await expect(resolveBrandSeo(prisma)).resolves.toMatchObject({
    siteName: "1Wiki", assets: { favicon: "/favicon.ico", icon48: "/brand/icon-48.png" },
    locales: { "zh-tw": { homeTitle: expect.any(String) }, en: expect.any(Object), ja: expect.any(Object) },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/brand-seo/repository.test.ts`

Expected: FAIL because `repository.ts` does not exist.

- [ ] **Step 3: Write minimal schema and resolver implementation**

```prisma
model BrandSeoSettings {
  id                 String   @id
  siteName           String
  alternateName      String?
  icon48SourceUrl    String?  @db.Text
  logoSourceUrl      String?  @db.Text
  defaultOgSourceUrl String?  @db.Text
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model LocaleSeoSettings {
  locale          String   @id
  homeTitle       String?
  homeDescription String?  @db.Text
  ogTitle         String?
  ogDescription   String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Create the SQL migration with these two tables and no seed rows. Fetch both tables in `Promise.all`; build all `supportedLocales` from dictionary defaults; ignore persisted rows whose locale fails `isLocale()`; catch DB read errors, log them, and return defaults. `getBrandAssetSource()` returns only `icon48SourceUrl`, `logoSourceUrl`, or `defaultOgSourceUrl`; unknown asset kinds return `null`.

- [ ] **Step 4: Run tests and Prisma validation**

Run: `npm test -- src/lib/brand-seo/repository.test.ts && npx prisma validate && npx prisma generate`

Expected: PASS; Prisma client has both new delegates.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260907130000_add_brand_seo_settings/migration.sql src/lib/brand-seo/constants.ts src/lib/brand-seo/repository.ts src/lib/brand-seo/repository.test.ts
git commit -m "feat: add brand SEO settings repository"
```

### Task 2: Pure form and binary asset validation

**Files:**
- Create: `src/lib/brand-seo/schema.ts`, `src/lib/brand-seo/assets.ts`
- Test: `src/lib/brand-seo/schema.test.ts`, `src/lib/brand-seo/assets.test.ts`

**Interfaces:** Produces `parseBrandSeoForm(value): BrandSeoInput` and `validateBrandAsset({ asset, bytes, declaredType }): Promise<ValidatedBrandAsset>`. `BrandSeoInput` contains `siteName`, nullable `alternateName`, `assets`, and `Record<Locale, LocaleSeoInput>`; later actions must use it without re-parsing raw FormData.

- [ ] **Step 1: Write failing tests for text normalization and image safety**

```ts
it("normalizes whitespace and rejects a blank site name", () => {
  expect(parseBrandSeoForm(validPayload({ siteName: "  1Wiki  " })).siteName).toBe("1Wiki");
  expect(() => parseBrandSeoForm(validPayload({ siteName: "   " }))).toThrow("網站名稱不可空白");
});
it("rejects a non-square icon, forged MIME, and tiny OG image", async () => {
  await expect(validateBrandAsset({ asset: "icon48", bytes: rectangularPng, declaredType: "image/png" })).rejects.toThrow("圖示必須為正方形 PNG");
  await expect(validateBrandAsset({ asset: "logo", bytes: jpegBytes, declaredType: "image/png" })).rejects.toThrow("檔案類型與實際內容不符");
  await expect(validateBrandAsset({ asset: "defaultOg", bytes: tinyPng, declaredType: "image/png" })).rejects.toThrow("分享圖至少需要 600×315");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/brand-seo/schema.test.ts src/lib/brand-seo/assets.test.ts`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement explicit validation**

```ts
export const MAX_BRAND_ASSET_BYTES = 10 * 1024 * 1024;
export const BRAND_SEO_LIMITS = { siteName: 80, alternateName: 120, title: 120, description: 320 } as const;
const allowedTypes = { icon48: ["image/png"], logo: ["image/jpeg", "image/png", "image/webp"], defaultOg: ["image/jpeg", "image/png", "image/webp"] } as const;
```

Use Zod for trimmed text, `isLocale()` for every locale key, and Sharp metadata to decode bytes. Reject unreadable images, files over 10 MB, icon MIME other than PNG, non-square icon, MIME mismatch, and OG images smaller than `600 × 315`. Require non-empty source URLs to have configured `R2_PUBLIC_BASE_URL` origin and `/uploads/brand/` pathname; normalize blank source URLs to `null`.

- [ ] **Step 4: Run tests to verify passing behavior**

Run: `npm test -- src/lib/brand-seo/schema.test.ts src/lib/brand-seo/assets.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand-seo/schema.ts src/lib/brand-seo/schema.test.ts src/lib/brand-seo/assets.ts src/lib/brand-seo/assets.test.ts
git commit -m "feat: validate brand SEO input and assets"
```

### Task 3: OWNER-only brand asset signing endpoint

**Files:**
- Create: `src/lib/brand-seo/uploads.ts`
- Create: `src/app/api/admin/brand-seo/uploads/route.ts`
- Test: `src/lib/brand-seo/uploads.test.ts`
- Test: `src/app/api/admin/brand-seo/uploads/route.test.ts`

**Interfaces:** Consumes Task 2 asset kinds. Produces `createBrandAssetUpload(file, asset, options)` and `POST(request)` returning `{ asset, uploadUrl, publicUrl }`; the form in Task 5 uses this endpoint.

- [ ] **Step 1: Write failing authorization and key-shape tests**

```ts
it("uses a brand-only key and only allows the asset MIME types", () => {
  expect(createBrandAssetUpload({ name: "mark.png", type: "image/png", size: 1024 }, "icon48", options)).toMatchObject({ key: expect.stringMatching(/^uploads\/brand\/2026\/09\//), contentType: "image/png" });
  expect(() => createBrandAssetUpload({ name: "mark.svg", type: "image/svg+xml", size: 1024 }, "icon48", options)).toThrow("圖示僅支援 PNG");
});
it("refuses EDITOR and signs only for active OWNER", async () => {
  getCurrentUser.mockResolvedValue({ role: "EDITOR", isActive: true, mustChangePassword: false });
  expect((await POST(requestFor("icon48"))).status).toBe(403);
  getCurrentUser.mockResolvedValue({ role: "OWNER", isActive: true, mustChangePassword: false });
  expect((await POST(requestFor("icon48"))).status).toBe(200);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/brand-seo/uploads.test.ts src/app/api/admin/brand-seo/uploads/route.test.ts`

Expected: FAIL because dedicated upload modules do not exist.

- [ ] **Step 3: Implement separate signing flow**

Use the existing R2 credentials, `PutObjectCommand`, public base URL, and 300-second expiry, but use only `uploads/brand/YYYY/MM/{uuid}.{extension}` keys. `POST` validates JSON `{ asset, file: { name, type, size } }`, checks `assertOwner(await getCurrentUser())`, returns 401 for no session, 403 for inactive/EDITOR/password change, and 400 for invalid payload or R2 configuration. Do not change the existing general image endpoint.

- [ ] **Step 4: Run endpoint and ordinary-upload regression tests**

Run: `npm test -- src/lib/brand-seo/uploads.test.ts src/app/api/admin/brand-seo/uploads/route.test.ts src/app/api/admin/uploads/images/route.test.ts`

Expected: PASS; authenticated EDITOR remains allowed only on the existing article image endpoint.

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand-seo/uploads.ts src/lib/brand-seo/uploads.test.ts src/app/api/admin/brand-seo/uploads/route.ts src/app/api/admin/brand-seo/uploads/route.test.ts
git commit -m "feat: add owner brand asset uploads"
```

### Task 4: Atomic OWNER save action and invalidation

**Files:**
- Create: `src/lib/brand-seo/invalidation.ts`
- Create: `src/app/(backoffice)/admin/brand-seo/actions.ts`
- Test: `src/lib/brand-seo/invalidation.test.ts`
- Test: `src/app/(backoffice)/admin/brand-seo/actions.test.ts`

**Interfaces:** Consumes `parseBrandSeoForm` and Task 2 validation. Produces `saveBrandSeoAction(formData)` and `brandSeoInvalidationPaths()`. Task 5 binds the action to the form; Task 6 relies on its path list.

- [ ] **Step 1: Write failing action tests**

```ts
it("builds every public and admin route affected by a brand setting", () => {
  expect(brandSeoInvalidationPaths()).toEqual(expect.arrayContaining([
    "/zh-tw", "/en", "/ja", "/manifest.webmanifest", "/brand/icon-48.png", "/brand/logo", "/brand/og-default", "/sitemap.xml", "/admin/brand-seo",
  ]));
});
it("does not begin a transaction when stored asset validation fails", async () => {
  validateStoredBrandAssets.mockRejectedValue(new Error("圖示必須為正方形 PNG"));
  await expect(saveBrandSeoAction(validFormData())).rejects.toThrow("redirect:/admin/brand-seo?error=");
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/lib/brand-seo/invalidation.test.ts 'src/app/(backoffice)/admin/brand-seo/actions.test.ts'`

Expected: FAIL because these modules do not exist.

- [ ] **Step 3: Implement guard, final asset fetch, transaction, and refresh**

```ts
export async function saveBrandSeoAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  try {
    const input = parseBrandSeoForm(formDataToPayload(formData));
    await validateStoredBrandAssets(input.assets);
    await prisma.$transaction(async (tx) => {
      await tx.brandSeoSettings.upsert({ where: { id: BRAND_SEO_SETTINGS_ID }, create: toBrandCreate(input), update: toBrandUpdate(input) });
      await Promise.all(supportedLocales.map((locale) => tx.localeSeoSettings.upsert({ where: { locale }, create: { locale, ...input.locales[locale] }, update: input.locales[locale] })));
    });
  } catch (error) { redirect(`/admin/brand-seo?error=${encodeURIComponent(message(error))}`); }
  brandSeoInvalidationPaths().forEach((path) => revalidatePath(path));
  redirect("/admin/brand-seo?success=saved");
}
```

`validateStoredBrandAssets` fetches each non-null source with `cache: "no-store"`, accepts only successful responses, bounds body size to 10 MB, and delegates to Task 2. It never deletes or references invalid uploads. Maintain existing redirect convention: no session → `/login`; password-change user → `/change-password`; non-OWNER → `/admin`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/brand-seo/invalidation.test.ts 'src/app/(backoffice)/admin/brand-seo/actions.test.ts'`

Expected: PASS; successful owner write revalidates every path once, and any validation/transaction error retains existing DB values.

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand-seo/invalidation.ts src/lib/brand-seo/invalidation.test.ts 'src/app/(backoffice)/admin/brand-seo/actions.ts' 'src/app/(backoffice)/admin/brand-seo/actions.test.ts'
git commit -m "feat: save brand SEO settings atomically"
```

### Task 5: OWNER backoffice form, upload UX, and navigation

**Files:**
- Modify: `src/components/admin/admin-nav.tsx`, `src/app/globals.css`
- Create: `src/app/(backoffice)/admin/brand-seo/page.tsx`
- Create: `src/components/admin/brand-seo-form.tsx`
- Test: `src/components/admin/admin-nav.test.tsx`, `src/app/(backoffice)/admin/brand-seo/page.test.tsx`, `src/components/admin/brand-seo-form.test.tsx`

**Interfaces:** Consumes `ResolvedBrandSeo`, `/api/admin/brand-seo/uploads`, and `saveBrandSeoAction`. Field names must be `siteName`, `alternateName`, `${locale}.homeTitle`, `${locale}.homeDescription`, `${locale}.ogTitle`, `${locale}.ogDescription`, plus the three source URLs.

- [ ] **Step 1: Write failing navigation and persistence tests**

```tsx
it("shows the brand SEO link only to OWNER", () => {
  expect(render(<AdminNav user={owner} />).getByRole("link", { name: "品牌與 SEO" })).toHaveAttribute("href", "/admin/brand-seo");
  expect(render(<AdminNav user={editor} />).queryByRole("link", { name: "品牌與 SEO" })).toBeNull();
});
it("keeps unsaved English input across a Japanese tab switch", async () => {
  render(<BrandSeoForm initial={defaults} action={vi.fn()} />);
  await userEvent.type(screen.getByLabelText("English 首頁標題"), "1Wiki Help");
  await userEvent.click(screen.getByRole("tab", { name: "日本語" }));
  await userEvent.click(screen.getByRole("tab", { name: "English" }));
  expect(screen.getByLabelText("English 首頁標題")).toHaveValue("1Wiki Help");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/components/admin/admin-nav.test.tsx 'src/app/(backoffice)/admin/brand-seo/page.test.tsx' src/components/admin/brand-seo-form.test.tsx`

Expected: FAIL because the page/form and nav link do not exist.

- [ ] **Step 3: Implement accessible settings UI**

Page checks login and `OWNER`, loads `resolveBrandSeo(prisma)`, and passes `saveBrandSeoAction` to a client form. Form uses `useState<Record<Locale, LocaleSeoInput>>`; tabs use `role="tablist"`, `role="tab"`, and associated `tabpanel`. Upload controls POST file metadata to the dedicated endpoint, PUT the file to its signed URL, retain `publicUrl` in a hidden field, and preserve the former asset if upload fails. Show existing asset previews and exact validation limits. Show this exact notice: `依本網站 metadata 的預覽，Google 顯示可能不同。`; explain Google chooses sitelinks and render no sitelink input. Add only scoped responsive grid, focus, preview, field-error, and SERP-preview CSS.

- [ ] **Step 4: Run UI tests**

Run: `npm test -- src/components/admin/admin-nav.test.tsx 'src/app/(backoffice)/admin/brand-seo/page.test.tsx' src/components/admin/brand-seo-form.test.tsx`

Expected: PASS; EDITOR cannot see/reach page, three fixed tabs render, and a failed upload leaves current preview/source intact.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/admin-nav.tsx src/components/admin/admin-nav.test.tsx 'src/app/(backoffice)/admin/brand-seo/page.tsx' 'src/app/(backoffice)/admin/brand-seo/page.test.tsx' src/components/admin/brand-seo-form.tsx src/components/admin/brand-seo-form.test.tsx src/app/globals.css
git commit -m "feat: add brand SEO admin settings page"
```

### Task 6: Stable public asset routes and metadata integration

**Files:**
- Create: `src/app/brand/[asset]/route.ts`
- Test: `src/app/brand/[asset]/route.test.ts`
- Modify: `src/app/[locale]/layout.tsx`, `src/app/manifest.ts`, `src/lib/seo/metadata.ts`, `src/lib/seo/structured-data.ts`
- Test: `src/app/[locale]/layout.test.ts`, `src/app/manifest.test.ts`, `src/lib/seo/metadata.test.ts`, `src/lib/seo/structured-data.test.ts`

**Interfaces:** Consumes Task 1 resolver. Produces `GET(request, { params })` for `icon-48.png`, `logo`, and `og-default`; all public metadata receives resolved brand values instead of duplicating `siteConfig` fallbacks.

- [ ] **Step 1: Read current Next.js route-handler and metadata documentation, then write failing tests**

Run first: `rg -n "Route Handlers|generateMetadata|manifest" node_modules/next/dist/docs -g '*.md' | head -40`

```ts
it("streams the configured icon through its stable public URL", async () => {
  getBrandAssetSource.mockResolvedValue("https://media.example/uploads/brand/icon.png");
  fetchMock.mockResolvedValue(new Response(iconPng, { headers: { "content-type": "image/png" } }));
  const response = await GET(new Request("https://1wiki.org/brand/icon-48.png"), { params: Promise.resolve({ asset: "icon-48.png" }) });
  expect(response.headers.get("content-type")).toBe("image/png");
});
it("uses saved Japanese homepage values and does not create hreflang", async () => {
  resolveBrandSeo.mockResolvedValue(savedBrand);
  const metadata = await generateMetadata({ params: Promise.resolve({ locale: "ja" }) });
  expect(metadata.description).toBe(savedBrand.locales.ja.homeDescription);
  expect(metadata.openGraph).toMatchObject({ siteName: savedBrand.siteName, images: ["/brand/og-default"] });
  expect(metadata.alternates).not.toHaveProperty("languages");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- 'src/app/brand/[asset]/route.test.ts' 'src/app/[locale]/layout.test.ts' src/app/manifest.test.ts src/lib/seo/metadata.test.ts src/lib/seo/structured-data.test.ts`

Expected: FAIL because stable asset route and resolved-brand metadata do not exist.

- [ ] **Step 3: Implement routes and asynchronous metadata**

```ts
const assets = {
  "icon-48.png": { kind: "icon48", fallback: "/icon-48.png", fallbackType: "image/png" },
  logo: { kind: "logo", fallback: "/icon.svg", fallbackType: "image/svg+xml" },
  "og-default": { kind: "defaultOg", fallback: "/og-default.svg", fallbackType: "image/svg+xml" },
} as const;
```

For a known asset, obtain source from the repository. If no source, an upstream response is non-OK, missing body, or exceeds timeout, issue a 307 redirect to the specified fallback. Otherwise stream its body with source `content-type` and `cache-control: public, max-age=3600`; unknown asset is 404. Make layout and manifest async, await the resolver, retain `/favicon.ico` and add `/brand/icon-48.png` in icons, use `/brand/og-default` for default share images, and use each locale’s saved homepage title/description. Extend JSON-LD helpers to accept `{ siteName, alternateNames, logoUrl }`, and pass that shared brand data to WebSite, Organization, and article publisher outputs. Do not add `alternates.languages`, `hreflang`, or routing fallback.

- [ ] **Step 4: Run focused regression tests**

Run: `npm test -- 'src/app/brand/[asset]/route.test.ts' 'src/app/[locale]/layout.test.ts' src/app/manifest.test.ts src/lib/seo/metadata.test.ts src/lib/seo/structured-data.test.ts src/app/favicon-assets.test.ts`

Expected: PASS; root ICO remains usable, unavailable source falls back without 500, and saved values are visible in all intended outputs.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/brand/[asset]/route.ts' 'src/app/brand/[asset]/route.test.ts' 'src/app/[locale]/layout.tsx' 'src/app/[locale]/layout.test.ts' src/app/manifest.ts src/app/manifest.test.ts src/lib/seo/metadata.ts src/lib/seo/metadata.test.ts src/lib/seo/structured-data.ts src/lib/seo/structured-data.test.ts src/app/favicon-assets.test.ts
git commit -m "feat: publish configurable brand SEO metadata"
```

### Task 7: Regression, documentation, and release verification

**Files:**
- Modify: `docs/project-status.md`, `docs/test-log.md`, `docs/search-engine-submission.md`
- Modify if needed for integration assertions: `src/app/[locale]/(site)/page.test.tsx`

**Interfaces:** Uses all prior tasks and produces reproducible verification records only; no runtime interface.

- [ ] **Step 1: Add final integration regression tests**

```ts
it("keeps an empty locale noindex after locale SEO is saved", async () => {
  await prisma.localeSeoSettings.create({ data: { locale: "en", homeTitle: "1Wiki English", homeDescription: "Support", ogTitle: null, ogDescription: null } });
  expect((await generateMetadataForLocale("en")).robots).toEqual({ index: false, follow: true });
});
it("does not emit hreflang for independent locale content", async () => {
  expect(await renderLocaleHome("zh-tw")).not.toContain("hreflang");
});
```

- [ ] **Step 2: Run focused groups, full suite, schema, lint, and production build**

Run:

```bash
npx prisma migrate deploy
npm test -- src/lib/brand-seo 'src/app/api/admin/brand-seo/uploads/route.test.ts' 'src/app/(backoffice)/admin/brand-seo' src/components/admin/brand-seo-form.test.tsx 'src/app/brand/[asset]/route.test.ts' 'src/app/[locale]/layout.test.ts' src/app/manifest.test.ts src/lib/seo/metadata.test.ts src/lib/seo/structured-data.test.ts 'src/app/[locale]/(site)/page.test.tsx'
npm test
npm run lint
npm run build
```

Expected: focused tests, suite, migration, and build pass. If full lint repeats known unrelated findings in `src/lib/wechat-import/browser-extractor.ts` or `src/lib/retention/cleanup.ts`, record them as pre-existing and do not attribute them to this feature.

- [ ] **Step 3: Verify actual HTTP public output**

Start production server using the approved test database, then request `/favicon.ico`, `/brand/icon-48.png`, `/brand/logo`, `/brand/og-default`, `/manifest.webmanifest`, `/zh-tw`, `/en`, and `/ja`. Confirm status and content type, metadata/JSON-LD values, and absence of `hreflang`; confirm empty languages retain `noindex, follow`.

- [ ] **Step 4: Update release documents**

Set `最後更新：2026-09-07` in all three documents. Record commands and exact test totals in `docs/test-log.md`; describe fixed locale registry and OWNER-only configuration in `docs/project-status.md`; add stable asset route, per-locale metadata, no-`hreflang`, sitemap submission, Search Console re-crawl, and Google-controlled site-name/snippet/sitelink caveat to `docs/search-engine-submission.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/project-status.md docs/test-log.md docs/search-engine-submission.md 'src/app/[locale]/(site)/page.test.tsx'
git commit -m "docs: record brand SEO verification"
```

## Plan Self-Review

- Spec coverage: Tasks 1–2 implement singleton, locale settings, fallback, and validation; Tasks 3–5 implement OWNER-only upload and UI; Task 6 implements stable public paths and metadata/JSON-LD/manifest; Task 7 verifies no `hreflang`, noindex behavior, caches, docs, build, and public endpoints.
- Scope: This is one brand SEO subsystem; dynamic language management and content translation remain excluded.
- Consistency: `icon48`, `logo`, and `defaultOg` are the only configurable asset keys; routes are `/brand/icon-48.png`, `/brand/logo`, `/brand/og-default`; locale input uses the existing `Locale` type.
- Placeholder scan: no incomplete markers or unspecified validation/test steps remain.
