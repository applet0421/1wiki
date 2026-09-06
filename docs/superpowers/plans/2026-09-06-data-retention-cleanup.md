# Data Retention Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add owner-configurable retention periods and a daily, safe cleanup process for fast-growing operational data.

**Architecture:** Add a singleton `DataRetentionSetting` row with explicit integer-day columns. Extend the existing `database-backup-worker` to invoke a pure, independently testable cleanup service after its normal schedule work; each cleanup category uses status-aware `deleteMany` conditions and returns a per-category summary. Expose the settings on the existing database-backup admin page without deleting core content or active work.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 PostgreSQL, TypeScript, Vitest, existing long-running TypeScript workers.

**Spec:** `docs/superpowers/specs/2026-09-06-data-retention-cleanup-design.md`

## Global Constraints

- Use the existing `database-backup-worker`; do not add an external scheduler or a second resident worker.
- Keep `Post`, `SitePage`, `Category`, `Author`, `PromptDefinition`, `PromptVersion`, and `LLMModelPrice` permanently retained.
- Never auto-delete `PENDING`, `RUNNING`, or `UNKNOWN` operational records.
- Validate retention values as integers from 1 through 3650 days.
- Cleanup failures must be logged and must not prevent the backup worker from continuing its loop.
- Process each cleanup category with a separate database operation and return deletion counts.
- Do not overwrite or revert unrelated existing worktree changes.

### Task 1: Add retention settings schema and validation

**Files:**
- Create: `prisma/migrations/20260906200000_add_data_retention_settings/migration.sql`
- Modify: `prisma/schema.prisma`
- Create: `src/lib/retention/settings.ts`
- Test: `src/lib/retention/settings.test.ts`

**Interfaces:**
- Produces `DATA_RETENTION_SETTING_ID = "default"`.
- Produces `DEFAULT_RETENTION_SETTINGS` with `llmUsageDays: 180`, `trafficDailyPageDays: 365`, `trafficDailySiteDays: 730`, `trafficSyncRunDays: 180`, `searchSuccessDays: 90`, `searchFailureDays: 365`, `imageGenerationDays: 90`, `publicInvalidationDays: 180`, and `databaseBackupFailureDays: 30`.
- Produces `RetentionSettings` with those nine numeric fields.
- Produces `validateRetentionSettings(input: RetentionSettings): RetentionSettings` and `getOrCreateRetentionSettings(client: PrismaClient)`.

- [ ] **Step 1: Write the failing validation and default tests**

```ts
it("returns the documented defaults", () => {
  expect(DEFAULT_RETENTION_SETTINGS).toEqual({
    llmUsageDays: 180, trafficDailyPageDays: 365, trafficDailySiteDays: 730,
    trafficSyncRunDays: 180, searchSuccessDays: 90, searchFailureDays: 365,
    imageGenerationDays: 90, publicInvalidationDays: 180, databaseBackupFailureDays: 30,
  });
});

it("rejects non-integer or out-of-range values", () => {
  expect(() => validateRetentionSettings({ ...DEFAULT_RETENTION_SETTINGS, llmUsageDays: 0 })).toThrow();
  expect(() => validateRetentionSettings({ ...DEFAULT_RETENTION_SETTINGS, llmUsageDays: 3650.5 })).toThrow();
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the settings module is missing**

Run: `npm test -- --run src/lib/retention/settings.test.ts`

Expected: FAIL because `src/lib/retention/settings.ts` and its exported defaults do not yet exist.

- [ ] **Step 3: Add the Prisma model, migration, defaults, validation, and upsert reader**

The Prisma model must contain the nine `Int` fields, all with the defaults above, plus `id String @id`, `createdAt DateTime @default(now())`, and `updatedAt DateTime @updatedAt`. The migration must create the table with `id = 'default'` seeded to the same defaults. `validateRetentionSettings` must throw a field-specific error when any value is not an integer in `[1, 3650]`; `getOrCreateRetentionSettings` must upsert the fixed id with the defaults.

- [ ] **Step 4: Run the focused test, TypeScript check, and Prisma client generation**

Run: `npm test -- --run src/lib/retention/settings.test.ts && npx tsc --noEmit && npx prisma generate`

Expected: PASS, no type errors, and generated Prisma client includes `dataRetentionSetting`.

- [ ] **Step 5: Commit the schema/settings unit**

```bash
git add prisma/schema.prisma prisma/migrations/20260906200000_add_data_retention_settings/migration.sql src/lib/retention/settings.ts src/lib/retention/settings.test.ts
git commit -m "feat: add configurable data retention settings"
```

### Task 2: Implement the cleanup service

**Files:**
- Create: `src/lib/retention/cleanup.ts`
- Test: `src/lib/retention/cleanup.test.ts`

**Interfaces:**
- Consumes `RetentionSettings` from Task 1.
- Produces `runDataRetentionCleanup(client: PrismaClient, settings: RetentionSettings, now?: Date): Promise<CleanupSummary>`.
- `CleanupSummary` contains a numeric field for each category and `totalDeleted`.

- [ ] **Step 1: Write failing tests for cutoff dates, allowed statuses, protected statuses, and summary counts**

Use a fake Prisma client whose ten `deleteMany` methods resolve to `{ count: 1 }`. Assert that calls include dates computed from the supplied fixed `now`, and exact status filters:

```ts
expect(client.lLMUsage.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-03-10T00:00:00.000Z") } } });
expect(client.trafficSyncRun.deleteMany).toHaveBeenCalledWith({ where: { startedAt: { lt: expect.any(Date) }, status: { in: ["SUCCESS", "FAILURE"] } } });
expect(client.searchEngineNotification.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: expect.any(Date), }, status: "SUCCESS" } });
expect(client.imageGeneration.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: expect.any(Date) }, status: { in: ["READY", "FAILED", "PLANNED"] }, imageBytes: null } });
expect(result.totalDeleted).toBe(10);
```

The public invalidation condition must be `status: "FAILED"`; the backup condition must include only `FAILURE` and stale `RUNNING`; no condition may include `PENDING` or `UNKNOWN`.

- [ ] **Step 2: Run the cleanup test and verify it fails because the service is missing**

Run: `npm test -- --run src/lib/retention/cleanup.test.ts`

Expected: FAIL because `runDataRetentionCleanup` is not defined.

- [ ] **Step 3: Implement one bounded `deleteMany` per category**

Compute each cutoff with `new Date(now.getTime() - days * 86_400_000)`. Use `createdAt` for event tables, `date` for both traffic tables, `startedAt` for sync runs, `expiresAt` for sessions, and `completedAt`/`createdAt` as appropriate for backups. For AI jobs, exclude `imageBytes` rows entirely. Return each count and their sum. Do not query rows first.

- [ ] **Step 4: Run cleanup tests and static checks**

Run: `npm test -- --run src/lib/retention/cleanup.test.ts src/lib/retention/settings.test.ts && npx tsc --noEmit`

Expected: PASS with no type errors.

- [ ] **Step 5: Commit the cleanup service**

```bash
git add src/lib/retention/cleanup.ts src/lib/retention/cleanup.test.ts
git commit -m "feat: add status-aware data retention cleanup"
```

### Task 3: Integrate cleanup with the database backup worker

**Files:**
- Modify: `scripts/database-backup-worker.ts`
- Create: `src/lib/backup/worker-cycle.ts`
- Test: `src/lib/backup/worker-cycle.test.ts`

**Interfaces:**
- Consumes `getOrCreateRetentionSettings` and `runDataRetentionCleanup`.
- Produces `runBackupWorkerCycle(client: PrismaClient, state: WorkerCycleState): Promise<WorkerCycleResult>`; the script delegates one loop iteration to this testable function, which runs cleanup at most once per 24 hours and logs a JSON-safe summary.

- [ ] **Step 1: Write a failing orchestration test**

Assert that a cleanup error is caught, logged through the worker error path, and does not prevent the worker cycle from returning to its loop; also assert that a successful cycle calls cleanup with the saved settings and current time, and that a second call within 24 hours skips cleanup.

- [ ] **Step 2: Run the worker test and verify it fails before integration exists**

Run: `npm test -- --run src/lib/backup/worker-cycle.test.ts`

Expected: FAIL because `runBackupWorkerCycle` is not defined.

- [ ] **Step 3: Integrate settings and cleanup after backup scheduling**

Move one loop iteration into `runBackupWorkerCycle`, load settings through `getOrCreateRetentionSettings(prisma)`, call `runDataRetentionCleanup(prisma, settings, new Date())`, and log `JSON.stringify({ type: "data-retention-cleanup", ...summary })`. Track `lastCleanupAt` in the worker state and run cleanup at most once per 24 hours, including when backups are disabled; a process restart may run an idempotent cleanup early. Wrap cleanup separately from backup execution so a cleanup failure updates the heartbeat error and returns control to the existing 30-second loop without turning a completed backup into a failed backup.

- [ ] **Step 4: Run worker, retention, backup, and type tests**

Run: `npm test -- --run src/lib/backup/worker-cycle.test.ts src/lib/retention src/lib/backup && npx tsc --noEmit && npm run lint`

Expected: PASS; existing backup behavior remains unchanged.

- [ ] **Step 5: Commit the worker integration**

```bash
git add scripts/database-backup-worker.ts src/lib/backup/worker-cycle.ts src/lib/backup/worker-cycle.test.ts
git commit -m "feat: run retention cleanup from backup worker"
```

### Task 4: Add owner settings UI and action

**Files:**
- Modify: `src/app/(backoffice)/admin/database-backups/actions.ts`
- Modify: `src/app/(backoffice)/admin/database-backups/page.tsx`
- Modify: `src/lib/retention/settings.ts`
- Test: `src/app/(backoffice)/admin/database-backups/actions.test.ts`
- Test: `src/app/(backoffice)/admin/database-backups/page.test.tsx`

**Interfaces:**
- Consumes the singleton settings reader and validator from Task 1.
- Produces `saveRetentionSettingsAction(formData: FormData)` with the same OWNER guard, redirect, and revalidation pattern as backup settings.

- [ ] **Step 1: Write failing action and rendering tests**

Assert that valid form data upserts all nine retention fields and redirects to `/admin/database-backups?success=retention-settings`; invalid values redirect with an error; the page renders each retention label and current value.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- --run 'src/app/(backoffice)/admin/database-backups/actions.test.ts' 'src/app/(backoffice)/admin/database-backups/page.test.tsx'`

Expected: FAIL because the action, mocked settings reader, and form fields do not exist.

- [ ] **Step 3: Implement the Server Action and form**

Parse the nine named inputs, validate them, upsert the singleton row, revalidate `/admin/database-backups`, and redirect on success. Add a separate panel titled `資料清理保留期限` with number inputs, descriptions, min `1`, max `3650`, and a save button. Keep backup `retentionCount` separate from database cleanup retention days.

- [ ] **Step 4: Run UI tests, type checks, and lint**

Run: `npm test -- --run 'src/app/(backoffice)/admin/database-backups/actions.test.ts' 'src/app/(backoffice)/admin/database-backups/page.test.tsx' src/lib/retention && npx tsc --noEmit && npm run lint`

Expected: PASS with all inputs rendered and persisted through the action.

- [ ] **Step 5: Commit the settings UI**

```bash
git add 'src/app/(backoffice)/admin/database-backups/actions.ts' 'src/app/(backoffice)/admin/database-backups/page.tsx' 'src/app/(backoffice)/admin/database-backups/actions.test.ts' 'src/app/(backoffice)/admin/database-backups/page.test.tsx' src/lib/retention/settings.ts
git commit -m "feat: add retention settings to backup admin"
```

### Task 5: Documentation, migration verification, and final regression checks

**Files:**
- Modify: `README.md`
- Modify: `docs/cache-monitoring.md`
- Modify: `docs/test-log.md` or the project’s current operational test log
- Test: all focused retention and backup tests

- [ ] **Step 1: Document defaults, configuration location, protected statuses, and worker schedule**

Update the operational docs with the exact default values from Task 1, explain that cleanup is performed by `database-backup-worker`, and state that content tables are never automatically cleaned.

- [ ] **Step 2: Verify migration and generated client in an isolated PostgreSQL environment**

Run: `docker compose -f docker-compose.test.yml down -v && docker compose -f docker-compose.test.yml up -d && npx prisma migrate deploy && npx prisma generate`

Expected: migration applies successfully and `DataRetentionSetting` contains the seeded `default` row.

- [ ] **Step 3: Run the focused suite and static checks**

Run: `npm test -- --run src/lib/retention 'src/app/(backoffice)/admin/database-backups' src/lib/backup && npx tsc --noEmit && npm run lint && git diff --check`

Expected: all focused tests pass, type checking and lint pass, and no whitespace errors exist.

- [ ] **Step 4: Review the final diff without touching unrelated worktree changes**

Run: `git status --short && git diff --stat`

Confirm that only the retention feature files and documentation changed in the feature commits; preserve pre-existing unrelated modifications.

- [ ] **Step 5: Commit documentation and verification notes**

```bash
git add README.md docs/cache-monitoring.md docs/test-log.md
git commit -m "docs: document data retention cleanup"
```
