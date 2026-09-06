import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RETENTION_SETTINGS, getOrCreateRetentionSettings, validateRetentionSettings } from "./settings";

describe("data retention settings", () => {
  it("returns the documented defaults", () => {
    expect(DEFAULT_RETENTION_SETTINGS).toEqual({
      llmUsageDays: 180,
      trafficDailyPageDays: 365,
      trafficDailySiteDays: 730,
      trafficSyncRunDays: 180,
      searchSuccessDays: 90,
      searchFailureDays: 365,
      imageGenerationDays: 90,
      publicInvalidationDays: 180,
      databaseBackupFailureDays: 30,
    });
  });

  it("rejects non-integer or out-of-range values", () => {
    expect(() => validateRetentionSettings({ ...DEFAULT_RETENTION_SETTINGS, llmUsageDays: 0 })).toThrow(/llmUsageDays/);
    expect(() => validateRetentionSettings({ ...DEFAULT_RETENTION_SETTINGS, llmUsageDays: 3650.5 })).toThrow(/llmUsageDays/);
  });

  it("upserts the singleton settings row", async () => {
    const upsert = vi.fn(async () => DEFAULT_RETENTION_SETTINGS);
    await getOrCreateRetentionSettings({ dataRetentionSetting: { upsert } } as never);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "default" },
      create: { id: "default", ...DEFAULT_RETENTION_SETTINGS },
      update: {},
    });
  });
});
