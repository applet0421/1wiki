# Prompt and LLM Usage Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 OWNER 能版本化管理所有 LLM Prompt，並在後台查詢每次呼叫的 token、狀態、耗時與美元估算成本。

**Architecture:** PostgreSQL 保存 Prompt 定義、不可變版本、模型費率與逐次用量；所有 AI 功能透過同一個執行層載入範本、呼叫 provider、正規化 usage 並寫入成本快照。Next.js Server Components 負責查詢畫面，所有 Server Actions 都重新驗證 OWNER 並以 repository 隔離 Prisma 操作。

**Tech Stack:** Next.js 16.3.4 App Router、React 19.2.8、TypeScript 6、Prisma 7.10/PostgreSQL、Zod 4、Vitest/Testing Library、Playwright。

**Spec:** `docs/superpowers/specs/2026-09-04-prompt-and-llm-usage-management-design.md`

## Global Constraints

- 僅 `OWNER` 能讀寫 Prompt、歷史版本與費率，或查看用量明細。
- 所有 Server Actions 必須在函式內重新驗證登入與角色；不可把頁面層權限當作安全邊界。
- 四個功能 key 固定為 `ARTICLE_GENERATE`、`ARTICLE_REWRITE`、`SOURCE_ANALYZE`、`IDEA_GENERATE`。
- Prompt 變數語法固定為 `{{variableName}}`，僅單次替換且禁止未知、缺少必填、空白或未閉合標記。
- JSON schema、Zod parse 與 HTML sanitize 保留在程式碼，不交由後台 Prompt 控制。
- 用量紀錄不得保存 API key、request headers、文章/來源全文、完整 Prompt 或完整模型輸出。
- token 缺失或模型費率未知時保存 `null`，不得用字數猜測。
- 費率與成本用 Prisma `Decimal`；歷史用量保存呼叫當下費率快照且不得重算。
- Prompt 更新與回復都建立新版本；舊版本不可修改。
- 開始實作前先讀 `node_modules/next/dist/docs/01-app/02-guides/forms.md`、`server-actions.md`、`authentication.md` 與 `01-app/03-api-reference/04-functions/redirect.md`。

## File Map

- `prisma/schema.prisma`：四個新模型、狀態 enum 與 User 關聯。
- `prisma/migrations/20260904180000_prompt_llm_usage/migration.sql`：資料表、索引與四組初始 Prompt v1。
- `src/lib/ai/prompt-definitions.ts`：固定 key、名稱與變數規格；執行期 Prompt 文字只從資料庫讀取。
- `src/lib/ai/prompt-template.ts`：變數抽取、驗證與單次 render，無資料庫依賴。
- `src/lib/ai/prompt-repository.ts`：啟用版本查詢、新版本建立及回復交易。
- `src/lib/ai/provider-usage.ts`：三家 provider usage 欄位正規化。
- `src/lib/ai/usage-repository.ts`：費率查詢、decimal 成本、用量寫入、篩選與彙總。
- `src/lib/ai/execute-llm.ts`：共用 Prompt 載入、provider 呼叫與成功/失敗稽核流程。
- `src/lib/ai/providers/*.ts`：保留 provider request 細節，改回傳內容與 usage metadata。
- `src/lib/ai/{generate-article,rewrite-article,content-generator}.ts`：改用共用執行層。
- `src/components/admin/prompt-editor.tsx`：Prompt 編輯、預覽、版本回復表單。
- `src/app/(backoffice)/admin/prompts/**`：OWNER Prompt 列表、詳情頁與 actions。
- `src/components/admin/model-price-form.tsx`：新增費率表單。
- `src/app/(backoffice)/admin/llm-usage/**`：OWNER KPI、篩選、分頁、明細與費率 actions。
- `src/components/admin/admin-nav.tsx`、`src/app/globals.css`：兩個入口與所需版面樣式。

---

### Task 1: Persist Prompt Versions, Prices, and Usage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260904180000_prompt_llm_usage/migration.sql`
- Modify: `tests/helpers/database.ts`
- Create: `tests/integration/prompt-usage-schema.test.ts`

**Interfaces:**
- Produces: Prisma models `PromptDefinition`, `PromptVersion`, `LLMModelPrice`, `LLMUsage`; enum `LLMUsageStatus`.
- Produces: relations `User.promptVersionsCreated` and `User.modelPricesCreated`; `createdById` is nullable only so migration-created v1 rows can represent the system actor.

- [ ] **Step 1: Write the failing integration test**

```ts
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";

describe("Prompt and LLM usage schema", () => {
  afterAll(() => prisma.$disconnect());

  it("installs four active v1 Prompt definitions", async () => {
    const definitions = await prisma.promptDefinition.findMany({
      include: { versions: true },
      orderBy: { key: "asc" },
    });
    expect(definitions.map((item) => item.key)).toEqual([
      "ARTICLE_GENERATE",
      "ARTICLE_REWRITE",
      "IDEA_GENERATE",
      "SOURCE_ANALYZE",
    ]);
    expect(definitions.every((item) => item.activeVersionNumber === 1)).toBe(true);
    expect(definitions.every((item) => item.versions.length === 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/integration/prompt-usage-schema.test.ts`

Expected: FAIL because `prisma.promptDefinition` does not exist.

- [ ] **Step 3: Add the Prisma schema**

Add `LLMUsageStatus { SUCCESS FAILURE }` and models with these exact constraints:

```prisma
model PromptDefinition {
  id                  String          @id @default(cuid())
  key                 String          @unique
  name                String
  description         String          @db.Text
  allowedVariables    Json
  requiredVariables   Json
  activeVersionNumber Int
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  versions            PromptVersion[]
  usage               LLMUsage[]
}

model PromptVersion {
  id                 String           @id @default(cuid())
  promptDefinitionId String
  versionNumber      Int
  systemTemplate     String           @db.Text
  userTemplate       String           @db.Text
  createdById        String?
  createdAt          DateTime         @default(now())
  promptDefinition   PromptDefinition @relation(fields: [promptDefinitionId], references: [id], onDelete: Restrict)
  createdBy          User?            @relation(fields: [createdById], references: [id], onDelete: SetNull)
  usage              LLMUsage[]

  @@unique([promptDefinitionId, versionNumber])
  @@index([createdById])
}

model LLMModelPrice {
  id                         String   @id @default(cuid())
  provider                   String
  model                      String
  inputUsdPerMillionTokens   Decimal  @db.Decimal(18, 8)
  outputUsdPerMillionTokens  Decimal  @db.Decimal(18, 8)
  effectiveAt                DateTime
  createdById                String?
  createdAt                  DateTime @default(now())
  createdBy                  User?    @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@unique([provider, model, effectiveAt])
  @@index([provider, model, effectiveAt])
}

model LLMUsage {
  id                                      String           @id @default(cuid())
  promptDefinitionId                      String
  promptVersionId                         String
  provider                                String
  model                                   String
  status                                  LLMUsageStatus
  inputTokens                             Int?
  outputTokens                            Int?
  totalTokens                             Int?
  durationMs                              Int
  errorSummary                            String?          @db.VarChar(500)
  inputUsdPerMillionTokensSnapshot        Decimal?         @db.Decimal(18, 8)
  outputUsdPerMillionTokensSnapshot       Decimal?         @db.Decimal(18, 8)
  estimatedCostUsd                        Decimal?         @db.Decimal(18, 10)
  createdAt                               DateTime         @default(now())
  promptDefinition                        PromptDefinition @relation(fields: [promptDefinitionId], references: [id], onDelete: Restrict)
  promptVersion                           PromptVersion    @relation(fields: [promptVersionId], references: [id], onDelete: Restrict)

  @@index([createdAt])
  @@index([promptDefinitionId, createdAt])
  @@index([provider, model, createdAt])
  @@index([status, createdAt])
}
```

Add `promptVersionsCreated PromptVersion[]` and `modelPricesCreated LLMModelPrice[]` to `User`.

- [ ] **Step 4: Generate and complete the migration**

Run: `npx prisma migrate dev --name prompt_llm_usage --create-only`

Rename the generated migration directory to `prisma/migrations/20260904180000_prompt_llm_usage` before editing its SQL so the file path in this plan stays stable.

Append idempotent SQL inserts for the four definitions and their v1 versions. Copy the exact strings from `src/lib/ai/prompt.ts`, changing runtime interpolations to the approved `{{variableName}}` markers. Use these metadata values:

```ts
const metadata = [
  { key: "ARTICLE_GENERATE", name: "一般文章生成", allowed: ["languageInstruction", "topic", "keyword", "instructions"], required: ["languageInstruction", "topic", "keyword", "instructions"] },
  { key: "ARTICLE_REWRITE", name: "文章改寫", allowed: ["languageInstruction", "sourceTitle", "sourceContentHtml"], required: ["languageInstruction", "sourceTitle", "sourceContentHtml"] },
  { key: "SOURCE_ANALYZE", name: "來源內容分析", allowed: ["languageInstruction", "sourceContent"], required: ["languageInstruction", "sourceContent"] },
  { key: "IDEA_GENERATE", name: "依主題生成文章", allowed: ["languageInstruction", "contentType", "title", "primaryKeyword", "searchIntent", "support", "structure", "categories", "sourceContent"], required: ["languageInstruction", "contentType", "title", "primaryKeyword", "searchIntent", "support", "structure", "categories", "sourceContent"] },
] as const;
```

Use stable migration-only IDs `prompt-article-generate`, `prompt-article-rewrite`, `prompt-source-analyze`, `prompt-idea-generate` and matching `prompt-version-*-v1` IDs. Insert definitions with `ON CONFLICT ("key") DO NOTHING`; insert versions with `ON CONFLICT ("promptDefinitionId", "versionNumber") DO NOTHING`. `createdById` is `NULL` for these four system-created versions.

Apply the migration: `npx prisma migrate dev`

- [ ] **Step 5: Keep database cleanup foreign-key safe**

Update `resetDatabase()` to delete `llmUsage`, `llmModelPrice`, and non-v1 test Prompt versions before deleting users. Never delete the four migration-owned definitions in routine test cleanup.

- [ ] **Step 6: Run schema verification**

Run: `npm run prisma:generate && npm test -- tests/integration/prompt-usage-schema.test.ts`

Expected: PASS with four definitions and one version each.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/helpers/database.ts tests/integration/prompt-usage-schema.test.ts
git commit -m "feat: add prompt and llm usage persistence"
```

### Task 2: Validate, Render, and Version Prompt Templates

**Files:**
- Create: `src/lib/ai/prompt-definitions.ts`
- Create: `src/lib/ai/prompt-template.ts`
- Create: `src/lib/ai/prompt-template.test.ts`
- Create: `src/lib/ai/prompt-repository.ts`
- Create: `src/lib/ai/prompt-repository.test.ts`
- Modify: `src/lib/ai/prompt.ts`
- Modify: `src/lib/ai/prompt.test.ts`

**Interfaces:**
- Produces: `type PromptKey = "ARTICLE_GENERATE" | "ARTICLE_REWRITE" | "SOURCE_ANALYZE" | "IDEA_GENERATE"`.
- Produces: `validatePromptTemplate(input: PromptTemplateInput): void` and `renderPromptTemplate(template: string, variables: Record<string, string>): string`.
- Produces: `getActivePrompt(client, key): Promise<ActivePrompt>`; `createPromptVersion(client, input): Promise<ActivePrompt>`; `restorePromptVersion(client, input): Promise<ActivePrompt>`.

- [ ] **Step 1: Write failing template tests**

```ts
import { describe, expect, it } from "vitest";
import { renderPromptTemplate, validatePromptTemplate } from "./prompt-template";

describe("Prompt templates", () => {
  it("replaces declared variables exactly once", () => {
    expect(renderPromptTemplate("主題：{{topic}}", { topic: "保留 {{keyword}}" }))
      .toBe("主題：保留 {{keyword}}");
  });

  it("rejects unknown and missing required variables", () => {
    expect(() => validatePromptTemplate({ systemTemplate: "", userTemplate: "{{unknown}}", allowedVariables: ["topic"], requiredVariables: ["topic"] }))
      .toThrow("未知變數：unknown");
    expect(() => validatePromptTemplate({ systemTemplate: "系統", userTemplate: "文章", allowedVariables: ["topic"], requiredVariables: ["topic"] }))
      .toThrow("缺少必要變數：topic");
  });

  it.each(["{{}}", "{{ topic }}", "{{topic"])("rejects malformed marker %s", (userTemplate) => {
    expect(() => validatePromptTemplate({ systemTemplate: "", userTemplate, allowedVariables: ["topic"], requiredVariables: [] }))
      .toThrow("Prompt 變數格式不正確");
  });
});
```

- [ ] **Step 2: Run template tests and verify RED**

Run: `npm test -- src/lib/ai/prompt-template.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure template contract**

```ts
export type PromptTemplateInput = {
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: readonly string[];
  requiredVariables: readonly string[];
};

const VALID_MARKER = /{{([A-Za-z][A-Za-z0-9]*)}}/g;

export function renderPromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(VALID_MARKER, (_marker, name: string) => variables[name] ?? "");
}
```

Implement validation by removing every valid marker and rejecting any remaining `{{` or `}}`; collect marker names, reject the first name outside `allowedVariables`, and reject each required name absent across the combined system/user text. Require a non-empty trimmed user template.

- [ ] **Step 4: Verify template GREEN**

Run: `npm test -- src/lib/ai/prompt-template.test.ts`

Expected: PASS.

- [ ] **Step 5: Define stable Prompt keys and metadata**

```ts
export const promptKeys = ["ARTICLE_GENERATE", "ARTICLE_REWRITE", "SOURCE_ANALYZE", "IDEA_GENERATE"] as const;
export type PromptKey = (typeof promptKeys)[number];

export function parsePromptKey(value: string): PromptKey {
  if (!promptKeys.includes(value as PromptKey)) throw new Error("找不到 Prompt。");
  return value as PromptKey;
}
```

Export the four names and allowed/required variable arrays listed in Task 1 for UI labels and call-site validation. Do not duplicate Prompt body text in this TypeScript module.

- [ ] **Step 6: Write failing repository tests**

Use a fake Prisma-shaped client that records `$transaction`, `findUnique`, `create`, and `updateMany`. Assert:

```ts
await expect(createPromptVersion(client, {
  key: "ARTICLE_GENERATE",
  baseVersionNumber: 1,
  systemTemplate: "編輯者",
  userTemplate: "主題：{{topic}}",
  createdById: "owner-1",
})).resolves.toMatchObject({ versionNumber: 2 });

expect(client.promptDefinition.updateMany).toHaveBeenCalledWith({
  where: { id: "definition-1", activeVersionNumber: 1 },
  data: { activeVersionNumber: 2 },
});
```

Add cases for zero updated rows producing `Prompt 已被其他管理員更新，請重新載入。`, immutable restore creating v3 from v1 text, and unknown key producing `找不到 Prompt。`.

- [ ] **Step 7: Run repository tests and verify RED**

Run: `npm test -- src/lib/ai/prompt-repository.test.ts`

Expected: FAIL because repository functions do not exist.

- [ ] **Step 8: Implement version transactions**

Define the active result exactly:

```ts
export type ActivePrompt = {
  definitionId: string;
  versionId: string;
  key: PromptKey;
  name: string;
  description: string;
  allowedVariables: string[];
  requiredVariables: string[];
  versionNumber: number;
  systemTemplate: string;
  userTemplate: string;
};
```

For create and restore, re-read the definition inside one interactive transaction, validate templates, create `activeVersionNumber + 1`, then update the definition with `updateMany({ where: { id, activeVersionNumber: baseVersionNumber } })`. Throw the conflict message when `count !== 1`; rollback must remove the just-created version.

- [ ] **Step 9: Convert legacy builders into variable maps**

Keep `getLanguageInstruction()` in `prompt.ts`. Replace exported full-string builders with focused variable builders:

```ts
export function articlePromptVariables(input: GenerateArticleInput): Record<string, string> {
  return {
    languageInstruction: getLanguageInstruction(input.locale),
    topic: input.topic.trim(),
    keyword: input.keyword.trim(),
    instructions: input.instructions?.trim() || "以清楚、可驗證、可操作的步驟回答",
  };
}
```

Add equivalent functions `rewritePromptVariables`, `analyzeSourcePromptVariables`, and `generateFromIdeaPromptVariables`; preserve current normalization, structure selection and category formatting exactly. Update prompt tests to assert the variable maps rather than hard-coded final strings.

- [ ] **Step 10: Run prompt unit tests**

Run: `npm test -- src/lib/ai/prompt-template.test.ts src/lib/ai/prompt-repository.test.ts src/lib/ai/prompt.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/ai/prompt-definitions.ts src/lib/ai/prompt-template.ts src/lib/ai/prompt-template.test.ts src/lib/ai/prompt-repository.ts src/lib/ai/prompt-repository.test.ts src/lib/ai/prompt.ts src/lib/ai/prompt.test.ts
git commit -m "feat: version database prompt templates"
```

### Task 3: Normalize Provider Token Usage

**Files:**
- Modify: `src/lib/ai/types.ts`
- Create: `src/lib/ai/provider-usage.ts`
- Create: `src/lib/ai/provider-usage.test.ts`
- Modify: `src/lib/ai/providers/deepseek.ts`
- Modify: `src/lib/ai/providers/openai.ts`
- Modify: `src/lib/ai/providers/gemini.ts`
- Modify: `src/lib/ai/providers/providers.test.ts`
- Modify: `src/lib/ai/errors.ts`

**Interfaces:**
- Produces: `type NormalizedTokenUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null }`.
- Produces audited calls `callDeepSeekStructuredWithUsage<T>`, `callOpenAIStructuredWithUsage<T>`, and `callGeminiStructuredWithUsage<T>` returning `ProviderResult<T> = { value: T; usage: NormalizedTokenUsage }`.
- Keeps existing `callDeepSeek`, `callOpenAI`, `callGemini` and non-audited structured wrappers returning their current parsed values until Task 5 migrates all consumers.
- Extends `AIProviderError` with optional normalized usage so parse failures can still be audited.

- [ ] **Step 1: Write failing usage mapping tests**

```ts
expect(normalizeOpenAIUsage({ input_tokens: 120, output_tokens: 30, total_tokens: 150 }))
  .toEqual({ inputTokens: 120, outputTokens: 30, totalTokens: 150 });
expect(normalizeDeepSeekUsage({ prompt_tokens: 90, completion_tokens: 10, total_tokens: 100 }))
  .toEqual({ inputTokens: 90, outputTokens: 10, totalTokens: 100 });
expect(normalizeGeminiUsage({ promptTokenCount: 80, candidatesTokenCount: 20, totalTokenCount: 100 }))
  .toEqual({ inputTokens: 80, outputTokens: 20, totalTokens: 100 });
expect(normalizeOpenAIUsage({ input_tokens: 5, output_tokens: 7 }))
  .toEqual({ inputTokens: 5, outputTokens: 7, totalTokens: 12 });
expect(normalizeGeminiUsage(undefined))
  .toEqual({ inputTokens: null, outputTokens: null, totalTokens: null });
```

- [ ] **Step 2: Run mapping tests and verify RED**

Run: `npm test -- src/lib/ai/provider-usage.test.ts`

Expected: FAIL because normalizers do not exist.

- [ ] **Step 3: Implement strict numeric normalization**

Only accept finite, non-negative integers. Calculate total only when both input and output exist; otherwise leave absent fields null. Export provider-specific functions with `unknown` input so malformed upstream objects cannot leak unchecked values.

- [ ] **Step 4: Run mapping tests and verify GREEN**

Run: `npm test -- src/lib/ai/provider-usage.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing adapter assertions**

Update response fixtures to include native usage and assert the new audited wrapper:

```ts
await expect(callOpenAIStructuredWithUsage({
  apiKey: "secret",
  model: "gpt-model",
  prompt: "prompt",
  fetcher,
  parse: parseArticleJson,
  jsonSchema: articleJsonSchema,
  schemaName: "article",
}))
  .resolves.toEqual({ value: article, usage: { inputTokens: 101, outputTokens: 49, totalTokens: 150 } });
```

Add equivalent DeepSeek and Gemini cases. Add an invalid JSON response with valid usage and assert the thrown `AIProviderError` retains that normalized usage.

- [ ] **Step 6: Run adapter tests and verify RED**

Run: `npm test -- src/lib/ai/providers/providers.test.ts`

Expected: FAIL because audited adapter wrappers do not exist.

- [ ] **Step 7: Return parsed values with usage**

Each audited adapter reads usage from the same HTTP response used for content. Wrap parse calls so an `AIProviderError` receives `error.usage = usage` before rethrow. Existing public wrappers await the audited result and return `.value`, keeping the complete test suite green before Task 5. Do not store or return raw request/response bodies through the new interface.

- [ ] **Step 8: Run provider tests**

Run: `npm test -- src/lib/ai/provider-usage.test.ts src/lib/ai/providers/providers.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ai/types.ts src/lib/ai/provider-usage.ts src/lib/ai/provider-usage.test.ts src/lib/ai/providers src/lib/ai/errors.ts
git commit -m "feat: normalize llm provider token usage"
```

### Task 4: Calculate Cost and Query Usage

**Files:**
- Create: `src/lib/ai/usage-repository.ts`
- Create: `src/lib/ai/usage-repository.test.ts`
- Create: `src/lib/ai/usage-query.ts`
- Create: `src/lib/ai/usage-query.test.ts`

**Interfaces:**
- Produces: `estimateCost(usage, price): Prisma.Decimal | null`.
- Produces: `recordLLMUsage(client, input): Promise<void>` and `findEffectivePrice(client, provider, model, startedAt)`.
- Produces: `parseUsageFilters(searchParams, now): UsageFilters`; `getUsageDashboard(client, filters): Promise<UsageDashboard>`.

- [ ] **Step 1: Write failing decimal cost tests**

```ts
import { Prisma } from "@prisma/client";

expect(estimateCost(
  { inputTokens: 1_000_000, outputTokens: 500_000, totalTokens: 1_500_000 },
  { inputUsdPerMillionTokens: new Prisma.Decimal("0.50"), outputUsdPerMillionTokens: new Prisma.Decimal("1.50") },
)?.toString()).toBe("1.25");

expect(estimateCost(
  { inputTokens: null, outputTokens: 10, totalTokens: null },
  { inputUsdPerMillionTokens: new Prisma.Decimal("0.50"), outputUsdPerMillionTokens: new Prisma.Decimal("1.50") },
)).toBeNull();
```

- [ ] **Step 2: Run cost tests and verify RED**

Run: `npm test -- src/lib/ai/usage-repository.test.ts`

Expected: FAIL because `estimateCost` does not exist.

- [ ] **Step 3: Implement cost and write input**

Use Decimal operations only:

```ts
const MILLION = new Prisma.Decimal(1_000_000);

export function estimateCost(usage: NormalizedTokenUsage, price: ModelPrice | null) {
  if (!price || usage.inputTokens === null || usage.outputTokens === null) return null;
  return new Prisma.Decimal(usage.inputTokens)
    .mul(price.inputUsdPerMillionTokens)
    .div(MILLION)
    .add(new Prisma.Decimal(usage.outputTokens).mul(price.outputUsdPerMillionTokens).div(MILLION));
}
```

`recordLLMUsage` truncates a sanitized `errorSummary` to 500 characters, copies price columns into snapshot fields, and stores the calculated result. `findEffectivePrice` selects the newest row with matching lower-case provider, exact model and `effectiveAt <= startedAt`.

- [ ] **Step 4: Add filter parser tests**

Assert that empty parameters produce the inclusive last-30-day range, page 1 and page size 50; malformed dates/status/page are ignored; `to` includes the complete selected calendar day; provider/model/key are trimmed and bounded.

- [ ] **Step 5: Implement dashboard queries**

Define:

```ts
export type UsageDashboard = {
  totals: {
    calls: number;
    successes: number;
    successRate: number | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: string;
  };
  rows: UsageRow[];
  totalRows: number;
  page: number;
  pageSize: 50;
  filterOptions: { promptKeys: string[]; providers: string[]; models: string[] };
};
```

Use one shared Prisma `where` object for count, aggregate and rows. Sum nullable cost as Decimal and serialize it to a string before crossing the Server Component boundary.

- [ ] **Step 6: Run repository/query tests**

Run: `npm test -- src/lib/ai/usage-repository.test.ts src/lib/ai/usage-query.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai/usage-repository.ts src/lib/ai/usage-repository.test.ts src/lib/ai/usage-query.ts src/lib/ai/usage-query.test.ts
git commit -m "feat: calculate and query llm usage cost"
```

### Task 5: Route Every AI Feature Through the Audited Executor

**Files:**
- Create: `src/lib/ai/execute-llm.ts`
- Create: `src/lib/ai/execute-llm.test.ts`
- Modify: `src/lib/ai/generate-article.ts`
- Modify: `src/lib/ai/generate-article.test.ts`
- Modify: `src/lib/ai/rewrite-article.ts`
- Modify: `src/lib/ai/rewrite-article.test.ts`
- Modify: `src/lib/ai/content-generator.ts`
- Modify: `src/lib/ai/content-generator.test.ts`

**Interfaces:**
- Produces: `executeLLMCall<T>(input: ExecuteLLMInput<T>, options?: ExecuteLLMOptions): Promise<T>`.
- Consumes: active Prompt repository, template renderer, AI config, provider adapters, price lookup and usage recorder.

- [ ] **Step 1: Write failing executor success test**

Inject a fake `getActivePrompt`, provider caller, clock, price lookup and recorder. Assert the provider receives rendered system/user strings, result value returns unchanged, and recorder receives `SUCCESS`, Prompt ids/version, duration, usage and price.

```ts
await expect(executeLLMCall({
  key: "ARTICLE_GENERATE",
  variables: { topic: "登入", keyword: "修復", languageInstruction: "繁中", instructions: "清楚回答" },
  jsonSchema: { type: "object" },
  schemaName: "article",
  parse: (value) => String(value),
}, dependencies)).resolves.toBe("完成");

expect(dependencies.recordUsage).toHaveBeenCalledWith(expect.objectContaining({
  status: "SUCCESS",
  promptDefinitionId: "definition-1",
  promptVersionId: "version-2",
  durationMs: 125,
}));
```

- [ ] **Step 2: Add failure-path tests before implementation**

Cover provider rejection with usage metadata, parse rejection after successful HTTP response, unknown price, and recorder failure. Assert the original AI error is rethrown, failure status is recorded when possible, and recorder failure is sent to an injected `onAuditError` without replacing a successful value or original error.

- [ ] **Step 3: Run executor tests and verify RED**

Run: `npm test -- src/lib/ai/execute-llm.test.ts`

Expected: FAIL because executor does not exist.

- [ ] **Step 4: Implement one execution boundary**

Use this public input contract:

```ts
export type ExecuteLLMInput<T> = {
  key: PromptKey;
  variables: Record<string, string>;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  parse: (value: unknown) => T;
};
```

Resolve config before provider selection. Load the active Prompt once, validate the provided variable keys against its allowed/required sets, render system and user strings, then call the matching `call*StructuredWithUsage` adapter, which parses exactly once. Record elapsed milliseconds after it returns. Catch only to audit and rethrow. Wrap usage persistence in its own `try/catch` that calls `console.error("LLM usage audit failed", error)` by default without Prompt text or variables.

- [ ] **Step 5: Verify executor GREEN**

Run: `npm test -- src/lib/ai/execute-llm.test.ts`

Expected: PASS.

- [ ] **Step 6: Write failing feature integration expectations**

Update the three existing feature test suites to inject the executor dependency and assert exact keys:

```ts
expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "ARTICLE_GENERATE" }));
expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "ARTICLE_REWRITE" }));
expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "SOURCE_ANALYZE" }));
expect(execute).toHaveBeenCalledWith(expect.objectContaining({ key: "IDEA_GENERATE" }));
```

Keep assertions for normalization, category validation, schema parsing and HTML sanitizing.

- [ ] **Step 7: Run feature tests and verify RED**

Run: `npm test -- src/lib/ai/generate-article.test.ts src/lib/ai/rewrite-article.test.ts src/lib/ai/content-generator.test.ts`

Expected: FAIL because features still call provider adapters directly.

- [ ] **Step 8: Replace all direct provider selection**

Delete provider/config imports from the three feature modules. Call `executeLLMCall` with the correct key, variable builder, schema name, JSON schema, max token setting and existing parser. Preserve existing `Options.env` and `Options.fetcher` compatibility by passing them to executor dependencies so current tests and call sites do not change behavior.

- [ ] **Step 9: Run all AI tests**

Run: `npm test -- src/lib/ai`

Expected: PASS with all four functional keys covered.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ai
git commit -m "feat: audit every llm execution"
```

### Task 6: Add OWNER Prompt Management UI

**Files:**
- Modify: `src/components/admin/admin-nav.tsx`
- Create: `src/components/admin/admin-nav.test.tsx`
- Create: `src/components/admin/prompt-editor.tsx`
- Create: `src/components/admin/prompt-editor.test.tsx`
- Create: `src/app/(backoffice)/admin/prompts/page.tsx`
- Create: `src/app/(backoffice)/admin/prompts/page.test.tsx`
- Create: `src/app/(backoffice)/admin/prompts/[key]/page.tsx`
- Create: `src/app/(backoffice)/admin/prompts/[key]/actions.ts`
- Create: `src/app/(backoffice)/admin/prompts/[key]/actions.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `assertOwner`, `getCurrentUser`, Prompt repository create/restore/list/get functions.
- Produces: routes `/admin/prompts` and `/admin/prompts/[key]`.

- [ ] **Step 1: Write failing navigation and page permission tests**

Assert OWNER sees links to `/admin/prompts` and `/admin/llm-usage` after 分類; EDITOR sees neither. Mock `getCurrentUser` for the Prompt list page and assert EDITOR redirects to `/admin`, while OWNER receives rows from the repository.

- [ ] **Step 2: Run permission tests and verify RED**

Run: `npm test -- src/components/admin/admin-nav.test.tsx src/app/'(backoffice)'/admin/prompts/page.test.tsx`

Expected: FAIL because links/routes do not exist.

- [ ] **Step 3: Add OWNER navigation and Prompt list**

Use the existing `user.role === "OWNER"` branch for all three owner links in order: `Prompt 管理`, `LLM 用量`, `帳號`. The list page follows `users/page.tsx`: redirect unauthenticated users to `/login`, non-owner users to `/admin`, then render key, name, active version, and updated time.

- [ ] **Step 4: Write failing action tests**

Mock session and repository. Assert EDITOR requests reject before repository access. OWNER save passes `baseVersionNumber`, templates and `createdById`; restore passes selected historical version and current base version. Assert validation/conflict messages redirect back URL-encoded and success redirects include `?success=saved` or `?success=restored`.

- [ ] **Step 5: Run action tests and verify RED**

Run: `npm test -- src/app/'(backoffice)'/admin/prompts/'[key]'/actions.test.ts`

Expected: FAIL because actions do not exist.

- [ ] **Step 6: Implement authenticated Server Actions**

```ts
async function requireOwnerForAction() {
  return assertOwner(await getCurrentUser());
}

export async function savePromptAction(key: string, formData: FormData) {
  const owner = await requireOwnerForAction();
  const baseVersionNumber = Number(formData.get("baseVersionNumber"));
  try {
    await createPromptVersion(prisma, {
      key: parsePromptKey(key),
      baseVersionNumber,
      systemTemplate: String(formData.get("systemTemplate") || ""),
      userTemplate: String(formData.get("userTemplate") || ""),
      createdById: owner.id,
    });
  } catch (error) {
    redirect(`/admin/prompts/${encodeURIComponent(key)}?error=${encodeURIComponent(publicPromptError(error))}`);
  }
  revalidatePath(`/admin/prompts/${key}`);
  redirect(`/admin/prompts/${encodeURIComponent(key)}?success=saved`);
}
```

Keep `redirect()` outside the mutation `try/catch` as required by Next.js 16. Implement restore with the same authorization and validation boundaries.

- [ ] **Step 7: Write failing editor interaction tests**

Render active templates and history, assert allowed/required variable chips, edit fields, click `預覽代入`, and verify sample values appear without changing form text. Assert every history row has a version, author/system marker, timestamp, and `回復此版本` action.

- [ ] **Step 8: Implement detail page and editor**

The Server Component resolves `params: Promise<{ key: string }>` with `await params`, verifies OWNER, loads active Prompt plus versions, and binds key into actions. Use a small Client Component only for local preview; forms submit to Server Actions and server validation remains authoritative. Apply `.prompt-editor`, `.template-field`, `.variable-list`, and `.version-list` styles without changing global typography.

- [ ] **Step 9: Run Prompt UI tests**

Run: `npm test -- src/components/admin/admin-nav.test.tsx src/components/admin/prompt-editor.test.tsx src/app/'(backoffice)'/admin/prompts`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/admin src/app/'(backoffice)'/admin/prompts src/app/globals.css
git commit -m "feat: add owner prompt management"
```

### Task 7: Add LLM Usage Dashboard and Price Management

**Files:**
- Create: `src/components/admin/model-price-form.tsx`
- Create: `src/components/admin/model-price-form.test.tsx`
- Create: `src/app/(backoffice)/admin/llm-usage/page.tsx`
- Create: `src/app/(backoffice)/admin/llm-usage/page.test.tsx`
- Create: `src/app/(backoffice)/admin/llm-usage/actions.ts`
- Create: `src/app/(backoffice)/admin/llm-usage/actions.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `parseUsageFilters`, `getUsageDashboard`, `assertOwner`, and Prisma `llmModelPrice.create`.
- Produces: route `/admin/llm-usage` and action `createModelPriceAction(formData)`.

- [ ] **Step 1: Write failing dashboard page tests**

Mock OWNER and dashboard data. Assert labels `總呼叫數`, `成功率`, `輸入 Token`, `輸出 Token`, `估算成本（USD）`; filters for dates, function, provider, model and status; a row with Prompt v2; `無法估算` for null cost; and next/previous links that preserve current filters. Add EDITOR redirect coverage.

- [ ] **Step 2: Run page tests and verify RED**

Run: `npm test -- src/app/'(backoffice)'/admin/llm-usage/page.test.tsx`

Expected: FAIL because the dashboard page does not exist.

- [ ] **Step 3: Implement OWNER dashboard page**

Resolve `searchParams` asynchronously, pass plain strings into `parseUsageFilters`, and fetch dashboard plus recent model prices in parallel after authorization. Format tokens with `Intl.NumberFormat("zh-TW")`, success rate to one decimal place, duration in milliseconds, and USD cost to at most six decimal places while preserving `null` as `無法估算`.

- [ ] **Step 4: Write failing price action tests**

Assert OWNER inputs are normalized to lower-case provider and trimmed model; decimal strings `0.15` and `0.60` are saved exactly; zero/negative/NaN, empty model, invalid provider and invalid effective date are rejected; EDITOR never reaches Prisma; success redirects to `/admin/llm-usage?success=price-created`.

- [ ] **Step 5: Run action tests and verify RED**

Run: `npm test -- src/app/'(backoffice)'/admin/llm-usage/actions.test.ts`

Expected: FAIL because action does not exist.

- [ ] **Step 6: Implement Zod-validated price action**

```ts
const modelPriceSchema = z.object({
  provider: z.enum(["openai", "gemini", "deepseek"]),
  model: z.string().trim().min(1).max(120),
  inputRate: z.coerce.number().positive().finite(),
  outputRate: z.coerce.number().positive().finite(),
  effectiveAt: z.coerce.date(),
});
```

Authorize before parsing. Convert original form strings directly into `new Prisma.Decimal(value)` after Zod validation so binary floating-point is not persisted. Revalidate and redirect outside the mutation `try/catch`.

- [ ] **Step 7: Implement and test the price form**

Use native labels and fields for provider, exact model name, input/output USD per million token and effective datetime. Render the latest rows by provider/model/effective time and state that changes affect only future calls.

- [ ] **Step 8: Run dashboard tests**

Run: `npm test -- src/app/'(backoffice)'/admin/llm-usage src/components/admin/model-price-form.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/'(backoffice)'/admin/llm-usage src/components/admin/model-price-form.tsx src/components/admin/model-price-form.test.tsx src/app/globals.css
git commit -m "feat: add llm usage and pricing dashboard"
```

### Task 8: Verify Migration, Regression Safety, and Browser Flows

**Files:**
- Modify: `tests/e2e/admin-auth.spec.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-04-prompt-and-llm-usage-management-design.md`

**Interfaces:**
- Verifies the complete user-visible flow and deployment instructions.

- [ ] **Step 1: Add failing OWNER/EDITOR browser coverage**

Extend the authenticated admin setup to assert OWNER navigation reaches `/admin/prompts` and `/admin/llm-usage`. Create or reuse an EDITOR fixture, log in, assert both links are absent, and navigate directly to both URLs to verify redirect to `/admin`.

- [ ] **Step 2: Run targeted E2E and verify RED**

Run: `npm run test:e2e -- tests/e2e/admin-auth.spec.ts`

Expected: FAIL until both pages and permissions are fully wired into the running app/database.

- [ ] **Step 3: Complete deployment documentation**

Document this exact deployment order in README:

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

Document that provider/model/API key remain environment variables, Prompt content is managed in `/admin/prompts`, and model rates must be maintained in `/admin/llm-usage` for cost estimates. Update the design document's `最後更新` only if implementation caused a documented contract change; keep it `2026-09-04` otherwise.

- [ ] **Step 4: Run fresh database migration verification**

Run: `docker compose -f docker-compose.test.yml down -v && docker compose -f docker-compose.test.yml up -d`

Run: `npm run db:migrate && npm run prisma:generate && npm test -- tests/integration/prompt-usage-schema.test.ts`

Expected: migration succeeds from an empty database and the integration test reports four active v1 Prompt definitions.

- [ ] **Step 5: Run the complete automated suite**

Run: `npm test`

Expected: all Vitest suites pass with zero failures.

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

Run: `npm run build`

Expected: exit 0 and Next.js lists `/admin/prompts`, `/admin/prompts/[key]`, and `/admin/llm-usage` in the production build.

Run: `npm run test:e2e`

Expected: all Playwright projects pass with zero failures.

- [ ] **Step 6: Manually verify the requested browser experience**

At `http://localhost:3000/admin` as OWNER, verify the header order is `文章`, `分類`, `Prompt 管理`, `LLM 用量`, `帳號`, `密碼`. Edit one Prompt, preview variables, save it as the next version, restore v1 and confirm another new version is created. Add a known model rate, perform an AI operation, then verify the dashboard shows its function, provider/model, status, token values, duration, Prompt version and estimated USD. Confirm date/status filters and narrow viewport horizontal scrolling.

- [ ] **Step 7: Review the final diff against the spec**

Run: `git diff --check && git status --short && git diff --stat af1dfd7..HEAD`

Check every success condition in the spec against a test or browser observation. Confirm no API key, Prompt body, source/article text or provider output appears in any `LLMUsage` write.

- [ ] **Step 8: Commit verification and documentation**

```bash
git add tests/e2e/admin-auth.spec.ts README.md docs/superpowers/specs/2026-09-04-prompt-and-llm-usage-management-design.md
git commit -m "test: verify prompt and llm usage management"
```
