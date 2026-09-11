# AI 文章「清晰教學」版型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓新 AI 生成、一般 AI 改寫與微信匯入文章可安全使用一致的「清晰教學」圖文版型，並讓作者可在後台審查與修正。

**Architecture:** 以受限 HTML 合約作為核心：sanitizer 僅允許 figure、caption 與三種既定語意 class；純函式 validator 對已清理的 HTML 產生不會阻止儲存的 diagnostics。Prompt、微信資產轉存、RichTextEditor 與公開／後台共用的 `article-prose` CSS 都只消費這份合約，不讓任一層自行猜測樣式或結構。

**Tech Stack:** Next.js 16.3、React 19、TypeScript、Vitest、Testing Library、Cheerio、sanitize-html、CSS。

**Spec:** `docs/superpowers/specs/2026-09-11-ai-article-layout-design.md`

## Global Constraints

- 文章 title 是唯一 H1；`contentHtml` 不得含 H1，且不得含 inline style、script 或任意 class。
- 僅允許 `article-callout`、`article-callout-warning`、`article-steps`、`article-image`、`article-image-standard`、`article-image-narrow` 六種文章 class。
- AI 不得替來源不足的圖片編造 alt 或圖說；應使用既有 `needsVerification` 或匯入審核警示。
- Layout diagnostics 不可改寫 HTML、重新呼叫模型或阻擋草稿保存；發布前只顯示可讀提示。
- 既有已發布文章不可批次遷移或自動變更；只有作者的明確 editor 操作會改變其 HTML。
- 公開 `public-prose` 與後台 `rich-editor.article-prose` 必須共用文章結構樣式，並維持既有廣告依 H2 切段的行為。
- 不新增依賴；所有圖文 URL 與 iframe 安全限制沿用既有 sanitizer 政策。

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/content/sanitize.ts` | 受限 article HTML 標籤、屬性與 class 白名單。 |
| `src/lib/content/article-layout.ts` | 純函式 `inspectArticleLayout(html)`，回傳文章可讀性與無障礙 diagnostics。 |
| `src/lib/content/article-layout.test.ts` | Validator 的完整、穩定單元覆蓋。 |
| `src/lib/ai/prompt.ts` | 一般生成與一般改寫所使用的版型指令。 |
| `src/lib/wechat-import/rewrite.ts` | 文字 block 的 heading／steps／warning 語意規則；保持圖片 block 不進模型。 |
| `src/lib/wechat-import/r2-transfer.ts` | 將已轉存圖片 block 建成帶 `figure`／`figcaption` 的安全正文。 |
| `src/components/admin/rich-text-editor.tsx` | 作者將選取內容變成 steps、warning 或帶圖說的 figure 的明確操作。 |
| `src/components/admin/post-editor.tsx` | 以目前 editor HTML 顯示不阻擋的 layout diagnostics。 |
| `src/app/globals.css` | 清晰教學的圖文、步驟與 warning 在公開與後台的共用呈現。 |

### Task 1: 建立安全的文章版型 HTML 合約

**Files:**
- Modify: `src/lib/content/sanitize.ts:3-48`
- Modify: `src/lib/content/sanitize.test.ts:1-48`

**Interfaces:**
- Produces: `sanitizeArticleHtml(html: string): string`，保留安全的 `figure`／`figcaption` 和固定 class，移除未知 class 與 inline style。
- Consumed by: Task 2 validator、Task 3 AI response sanitization、Task 4 微信轉存與 Task 5 editor。

- [ ] **Step 1: 寫出 sanitizer 的失敗測試**

```ts
it("preserves only the clear-tutorial figure and layout classes", () => {
  expect(sanitizeArticleHtml('<figure class="article-image article-image-narrow extra"><img src="https://img.example/line.png" alt="同步按鈕"><figcaption class="article-caption">執行同步</figcaption></figure><div class="article-callout article-callout-warning" style="color:red"><strong>注意</strong><p>保留 2GB。</p></div>'))
    .toBe('<figure class="article-image article-image-narrow"><img src="https://img.example/line.png" alt="同步按鈕" /><figcaption>執行同步</figcaption></figure><div class="article-callout article-callout-warning"><strong>注意</strong><p>保留 2GB。</p></div>');
});

it("removes unknown article classes but keeps existing image safety rules", () => {
  expect(sanitizeArticleHtml('<ol class="article-steps injected"><li>第一步</li></ol><img class="article-image" src="javascript:bad" alt="x">'))
    .toBe('<ol class="article-steps"><li>第一步</li></ol>');
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/lib/content/sanitize.test.ts`

Expected: FAIL；`figure`／`figcaption` 與 `class` 尚未在 sanitize policy 中保留。

- [ ] **Step 3: 最小化擴充白名單與 class transform**

在 `allowedTags` 加入 `figure`、`figcaption`；在 `allowedAttributes` 僅為 `div`、`ol`、`figure` 加入 `class`。新增 `allowedArticleClasses` set 和 `filterClasses(value)`，將 class token 過濾後以空格重組；以 `transformTags` 的 `div`、`ol`、`figure` transform 套用它，空字串時移除 class。不要讓 `p`、`img`、`figcaption` 接受 class。

```ts
const allowedArticleClasses = new Set([
  "article-callout", "article-callout-warning", "article-steps",
  "article-image", "article-image-standard", "article-image-narrow",
]);

function allowedClass(value: string | undefined) {
  const filtered = (value || "").split(/\s+/u).filter((name) => allowedArticleClasses.has(name));
  return filtered.length ? filtered.join(" ") : undefined;
}
```

- [ ] **Step 4: 執行測試並確認通過**

Run: `npm test -- src/lib/content/sanitize.test.ts`

Expected: PASS；既有 link、圖片 URL、script 與 Enter 行為測試持續通過。

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/sanitize.ts src/lib/content/sanitize.test.ts
git commit -m "feat: allow safe clear tutorial article markup"
```

### Task 2: 新增可重用的文章版型 diagnostics

**Files:**
- Create: `src/lib/content/article-layout.ts`
- Create: `src/lib/content/article-layout.test.ts`

**Interfaces:**
- Consumes: sanitized article HTML string from Task 1.
- Produces: `inspectArticleLayout(html: string): ArticleLayoutDiagnostic[]` where `ArticleLayoutDiagnostic = { code: "IMAGE_ALT_MISSING" | "IMAGE_CAPTION_MISSING" | "CONSECUTIVE_IMAGES" | "HEADING_LEVEL_SKIP" | "LONG_PARAGRAPH"; message: string }`.
- Consumed by: Task 6 PostEditor and server-side publication validation.

- [ ] **Step 1: 寫出 diagnostics 的失敗測試**

```ts
import { inspectArticleLayout } from "./article-layout";

it("reports missing figure captions, image alt text, image runs and skipped headings", () => {
  const codes = inspectArticleLayout('<h2>設定</h2><figure class="article-image"><img src="https://img.example/one.png" alt=""></figure><img src="https://img.example/two.png" alt="第二張"><h4>不允許</h4>')
    .map((item) => item.code);
  expect(codes).toEqual(["IMAGE_ALT_MISSING", "IMAGE_CAPTION_MISSING", "CONSECUTIVE_IMAGES", "HEADING_LEVEL_SKIP"]);
});

it("does not warn for a complete clear-tutorial section", () => {
  expect(inspectArticleLayout('<h2>同步</h2><ol class="article-steps"><li>開啟設定</li></ol><figure class="article-image"><img src="https://img.example/one.png" alt="同步按鈕"><figcaption>執行同步。</figcaption></figure><div class="article-callout article-callout-warning"><strong>注意</strong><p>保留空間。</p></div>')).toEqual([]);
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/lib/content/article-layout.test.ts`

Expected: FAIL；module does not exist.

- [ ] **Step 3: 實作純函式檢查器**

使用 `load(html, null, false)`，依 document order 檢查：每張 `img` 的 trim alt；每個 `figure.article-image` 是否有非空 `figcaption`；相鄰 element siblings 是否都是 image 或包含 image 的 figure；heading level 不得從 H2 跳到 H4；`p` 的 whitespace-normalized visible text 超過 500 字報 `LONG_PARAGRAPH`。以固定順序 append 診斷，並去除重複 code，避免畫面產生重複警示。

```ts
export type ArticleLayoutDiagnostic = { code: ArticleLayoutDiagnosticCode; message: string };
export function inspectArticleLayout(html: string): ArticleLayoutDiagnostic[] {
  const $ = load(html, null, false);
  // collect each diagnostic once, in document order
  return diagnostics;
}
```

- [ ] **Step 4: 補足長段落與正常 H2→H3 的測試後執行**

Run: `npm test -- src/lib/content/article-layout.test.ts src/lib/content/sanitize.test.ts`

Expected: PASS；H2→H3 不被標記，501 個可見字元的 `p` 只報一次 `LONG_PARAGRAPH`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/article-layout.ts src/lib/content/article-layout.test.ts
git commit -m "feat: inspect article layout diagnostics"
```

### Task 3: 將清晰教學規則寫入 AI 生成與改寫合約

**Files:**
- Modify: `src/lib/ai/prompt.ts:84-109,141-148`
- Modify: `src/lib/ai/prompt.test.ts:76-83`
- Modify: `src/lib/ai/rewrite-article.test.ts:1-44`
- Modify: `src/lib/ai/generate-article.test.ts:1-47`

**Interfaces:**
- Consumes: Task 1 safe element/class contract.
- Produces: 一般 `ARTICLE_GENERATE` 與 `ARTICLE_REWRITE` request 都包含 figure、steps、warning 與不捏造圖片描述的規則。
- Consumed by: `generateArticle`、`rewriteArticle` 的既有 LLM executor。

- [ ] **Step 1: 寫出 Prompt 與回應 sanitizer 的失敗測試**

```ts
it("requires clear-tutorial image semantics in rewrite prompts", () => {
  const prompt = buildRewriteArticlePrompt({ locale: "zh-tw", sourceTitle: "LINE", sourceContentHtml: "<p>內容</p>" });
  expect(prompt).toContain("article-callout-warning");
  expect(prompt).toContain("article-steps");
  expect(prompt).toContain("figcaption");
  expect(prompt).toContain("不得捏造圖片的 alt 或圖說");
});

it("keeps a valid generated figure after output sanitization", async () => {
  // make execute return an article whose contentHtml contains article-image and figcaption
  expect(result.contentHtml).toContain('<figure class="article-image article-image-standard">');
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/lib/ai/prompt.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/generate-article.test.ts`

Expected: FAIL；現有 instruction 不包含合約且 sanitizer 尚未被 fixture 驗證。

- [ ] **Step 3: 在兩個 general Prompt 加入完全相同的合約段落**

在 `buildRewriteArticlePrompt` 與一般生成模板的正文規則旁加入：只可使用 Task 1 tags/classes、圖片應在對應段落後、figure 必有 alt/figcaption、無法確認圖片含意就保留並列入 `needsVerification`（一般生成）或不捏造（一般改寫）、按序操作用 `ol.article-steps`、限制資訊才可用 `article-callout article-callout-warning`。不要要求每篇都有圖片、steps 或 warning。

- [ ] **Step 4: 執行完整 AI contract 測試**

Run: `npm test -- src/lib/ai/prompt.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/generate-article.test.ts src/lib/content/sanitize.test.ts`

Expected: PASS；unsafe class／style 仍消失，合法 figure 原封不動。

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/prompt.ts src/lib/ai/prompt.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/generate-article.test.ts
git commit -m "feat: guide AI output with clear tutorial markup"
```

### Task 4: 讓微信文字規則與轉存圖片符合共同合約

**Files:**
- Modify: `src/lib/wechat-import/rewrite.ts:186-199`
- Modify: `src/lib/wechat-import/rewrite.test.ts:68-104`
- Modify: `src/lib/wechat-import/r2-transfer.ts:10-20`
- Modify: `src/lib/wechat-import/r2-transfer.test.ts:1-35`

**Interfaces:**
- Consumes: Task 1 sanitizer contract and the existing `ArticleBlock` invariant.
- Produces: text block prompt permits only semantic steps/callouts it can safely generate; `buildContentHtml` emits `<figure class="article-image article-image-standard">` for transferred image blocks.
- Consumed by: existing transfer worker and `PostEditor` through `editorDraft.contentHtml`.

- [ ] **Step 1: 寫出微信的失敗測試**

```ts
expect(faithfulRequest.variables.blockContract).toContain("article-steps");
expect(faithfulRequest.variables.blockContract).toContain("article-callout-warning");
expect(faithfulRequest.variables.blockContract).not.toContain("figure");

await expect(prisma.weChatImport.findUniqueOrThrow({ where: { id: imported.id } })).resolves.toMatchObject({
  editorDraft: expect.objectContaining({
    contentHtml: '<p>改寫段落</p>\n<figure class="article-image article-image-standard"><img src="https://images.example.com/'
  }),
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/lib/wechat-import/rewrite.test.ts src/lib/wechat-import/r2-transfer.test.ts`

Expected: FAIL；現有 block contract 沒有 steps/callout，轉存只輸出裸 `img`。

- [ ] **Step 3: 實作文字 block 規則與 figure 組裝**

保持「圖片不會傳入模型」的不變式；在文字 block tag 規則中允許 Task 1 的 `div` 與 `ol` class，並明確禁止模型輸出 figure、figcaption 或 img。將 `buildContentHtml` 的 image branch 改為：

```ts
return `<figure class="article-image article-image-standard"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(block.alt)}"><figcaption>${escapeHtml(block.alt)}</figcaption></figure>`;
```

新增 `escapeHtml`，至少 escape `&`、`<`、`>`，以文字安全地插入 figcaption；保留 `escapeAttribute` 用於屬性。空 alt 產出空 caption，讓 Task 2 diagnostics 進行後續提醒，而非猜測描述。

- [ ] **Step 4: 執行微信回歸測試**

Run: `npm test -- src/lib/wechat-import/rewrite.test.ts src/lib/wechat-import/r2-transfer.test.ts src/lib/wechat-import/worker.test.ts`

Expected: PASS；原有圖片 asset/order invariant 與 R2 retry 語意不變，editor draft 含可安全 sanitize 的 figure。

- [ ] **Step 5: Commit**

```bash
git add src/lib/wechat-import/rewrite.ts src/lib/wechat-import/rewrite.test.ts src/lib/wechat-import/r2-transfer.ts src/lib/wechat-import/r2-transfer.test.ts
git commit -m "feat: format WeChat imports as clear tutorial articles"
```

### Task 5: 提供不破壞既有內容的 editor 版型工具

**Files:**
- Modify: `src/components/admin/rich-text-editor.tsx:16-158`
- Modify: `src/components/admin/rich-text-editor.test.tsx:1-103`

**Interfaces:**
- Consumes: Task 1 safe markup and existing editor selection/image state.
- Produces: 「步驟清單」、「注意提示」、「圖片圖說」、「圖片寬度」四個 `type="button"` 工具，皆透過 `updateHtml(editor.innerHTML)` 同步 hidden input。
- Consumed by: Task 6 PostEditor diagnostics and the current post save action.

- [ ] **Step 1: 寫出 editor 的失敗測試**

```tsx
it("wraps a selected image in an editable standard figure", () => {
  const { container } = render(<RichTextEditor initialHtml='<img src="https://img.example/one.png" alt="同步按鈕">' />);
  fireEvent.click(container.querySelector("img")!);
  fireEvent.click(screen.getByRole("button", { name: "圖片圖說" }));
  fireEvent.change(screen.getByLabelText("圖片圖說"), { target: { value: "在好友頁執行同步。" } });
  fireEvent.click(screen.getByRole("button", { name: "更新圖片版型" }));
  expect(container.querySelector("figure.article-image-standard figcaption")).toHaveTextContent("在好友頁執行同步。");
});

it("inserts a warning callout and a semantic steps list", () => {
  render(<RichTextEditor initialHtml="<p>先同步</p>" />);
  fireEvent.click(screen.getByRole("button", { name: "注意提示" }));
  expect(screen.getByLabelText("提示標題")).toHaveValue("注意");
  // submit then select the paragraph and activate 步驟清單
  expect(editor.innerHTML).toContain('class="article-callout article-callout-warning"');
  expect(editor.innerHTML).toContain('class="article-steps"');
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/components/admin/rich-text-editor.test.tsx`

Expected: FAIL；控制項與 conversion helpers 尚不存在。

- [ ] **Step 3: 加入小型 DOM helpers 與受控 inline form**

新增 `insertWarningCallout()`：restore selection 後插入 `<div class="article-callout article-callout-warning"><strong>注意</strong><p>請輸入內容。</p></div>`，並把 caret 放在 paragraph。新增 `convertSelectionToSteps()`：僅在 selection 包含一個或多個 `p`／`div` sibling 時，替換為 `<ol class="article-steps"><li>…</li></ol>`；未選到有效段落時顯示 status「請先選取一或多個操作段落」。

選取圖片時，將 `selectedImage` 擴充為取得現有最近 `figure`；「圖片圖說」顯示圖說 textarea 與 `standard`／`narrow` select。儲存時只包裝選取圖片、保留 `src`、alt、width、height，並在 figure 尚不存在時插入；取消只關閉表單。每個按鈕維持 `type="button"`，不提交文章 form。

- [ ] **Step 4: 執行 editor 與 AI image regression**

Run: `npm test -- src/components/admin/rich-text-editor.test.tsx src/components/admin/ai-image-panel.test.tsx`

Expected: PASS；既有 URL 插圖、上傳、alt 編輯與 AI 圖片插入不改變；新操作皆更新 `[name="contentHtml"]`。

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/rich-text-editor.tsx src/components/admin/rich-text-editor.test.tsx
git commit -m "feat: add clear tutorial editor controls"
```

### Task 6: 顯示 diagnostics、套用共用樣式並完成發布驗證

**Files:**
- Modify: `src/components/admin/post-editor.tsx:1-105`
- Modify: `src/components/admin/post-editor.test.tsx:1-63`
- Modify: `src/app/(backoffice)/admin/posts/actions.ts:1-75`
- Modify: `src/app/globals.css:149-193`
- Modify: `src/lib/content/repository.test.ts`（新增 relevant publish assertions if absent）
- Modify: `src/components/site/article-panel.test.tsx:1-70`

**Interfaces:**
- Consumes: Task 2 `inspectArticleLayout` and Task 5 `onHtmlChange` callback.
- Produces: aria-labeled 「文章版型檢查」警示區，及公開／後台共享的 `article-prose` styles；server publish re-calculates diagnostics without preventing a valid existing article from being published.

- [ ] **Step 1: 寫出 PostEditor 與 server save 的失敗測試**

```tsx
it("shows live non-blocking layout diagnostics for missing image descriptions", () => {
  render(<PostEditor /* minimum valid fixture */ post={{ ...post, contentHtml: '<img src="https://img.example/one.png" alt="">' }} showAIGenerator={false} />);
  expect(screen.getByRole("region", { name: "文章版型檢查" })).toHaveTextContent("圖片缺少替代文字");
  expect(screen.getByRole("button", { name: "儲存草稿" })).not.toBeDisabled();
});
```

```ts
it("keeps publishing a legacy article while calculating layout diagnostics server-side", async () => {
  await expect(savePost(prisma, authorId, { ...legacyInput, status: "PUBLISHED", contentHtml: '<p>既有內容</p>' })).resolves.toMatchObject({ status: "PUBLISHED" });
});
```

- [ ] **Step 2: 執行測試並確認失敗**

Run: `npm test -- src/components/admin/post-editor.test.tsx src/lib/content/repository.test.ts src/components/site/article-panel.test.tsx`

Expected: FAIL；PostEditor 尚未監聽 editor HTML，也沒有 layout review region。

- [ ] **Step 3: 實作 live review、server recalculation 與共用 CSS**

在 `PostEditor` 新增 `contentHtml` state，初始值為 `source?.contentHtml || ""`；傳給 RichTextEditor 的 `onHtmlChange` 同步 state，並以 `inspectArticleLayout(contentHtml)` 產出 `<section className="verification-warning" role="region" aria-label="文章版型檢查">`。當 diagnostics 為空時不渲染區塊。草稿／發布按鈕永遠維持可用。

在 `savePostAction` 與 `togglePostStatusAction` 對 sanitize/alt-normalized HTML 呼叫 `inspectArticleLayout`，將結果僅寫入 structured server log（不寫資料庫、不加入 redirect error）；這是 server-side re-calculation，不能信任 UI。採用 `console.warn("article-layout-diagnostics", { postId: id || "new", codes: diagnostics.map(...) })`，不得記錄正文或圖片 URL。

在 `globals.css` 為 `.article-prose figure.article-image`、`figcaption`、`.article-steps` 與 `.article-callout-warning` 加入可讀的桌機／手機樣式：圖片 `max-width:100%`、standard 置中、narrow 在桌機限制為約 36rem、caption 次要文字、黃色提示表面帶左側 accent、序號可辨識。只使用這些 article selectors，確保 `rich-editor` 與 `public-prose` 同時生效；不要更動 `.article-body` 和 `segmentArticle`。

- [ ] **Step 4: 執行單元、元件與 production build 驗證**

Run: `npm test -- src/lib/content/sanitize.test.ts src/lib/content/article-layout.test.ts src/lib/ai/prompt.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/generate-article.test.ts src/lib/wechat-import/rewrite.test.ts src/lib/wechat-import/r2-transfer.test.ts src/components/admin/rich-text-editor.test.tsx src/components/admin/ai-image-panel.test.tsx src/components/admin/post-editor.test.tsx src/lib/content/repository.test.ts src/components/site/article-panel.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS；Next.js 16.3 build completes without type or lint errors.

- [ ] **Step 5: 完成桌機／手機公開頁檢查並提交**

Run: `npm run dev`

Expected: local server starts; use the existing Playwright setup at desktop and a 390px mobile viewport to open one generated/rewritten article containing a figure, steps and warning. Confirm no horizontal overflow, image/figcaption remain paired, and H2-based ad segmentation still places ads only between completed H2 sections.

```bash
git add src/components/admin/post-editor.tsx src/components/admin/post-editor.test.tsx src/app/(backoffice)/admin/posts/actions.ts src/app/globals.css src/lib/content/repository.test.ts src/components/site/article-panel.test.tsx
git commit -m "feat: review and render clear tutorial article layouts"
```

## Plan self-review

Spec coverage is complete: Task 1 implements the safe contract; Task 2 covers non-blocking diagnostics; Task 3 covers general AI generation and rewrite; Task 4 covers the block-based WeChat pipeline; Task 5 covers author-selected editing only; Task 6 provides shared rendering, server-side re-calculation, desktop/mobile validation and preserves H2 ad segmentation.

The plan has no unresolved placeholders, uses the same `inspectArticleLayout` and diagnostic code names in every task, adds no dependencies, and leaves existing published articles unchanged unless an author deliberately edits them.
