import { describe, expect, it } from "vitest";
import { isDailyBackupDue, validateBackupSettings } from "./schedule";

describe("database backup schedule", () => {
  it("validates daily time, timezone and retention", () => {
    expect(validateBackupSettings({ dailyTime: "02:30", timezone: "Asia/Taipei", retentionCount: 7 })).toEqual({ dailyTime: "02:30", timezone: "Asia/Taipei", retentionCount: 7 });
    expect(() => validateBackupSettings({ dailyTime: "2:30", timezone: "Asia/Taipei", retentionCount: 7 })).toThrow();
    expect(() => validateBackupSettings({ dailyTime: "02:30", timezone: "No/Such_Zone", retentionCount: 7 })).toThrow();
    expect(() => validateBackupSettings({ dailyTime: "02:30", timezone: "Asia/Taipei", retentionCount: 0 })).toThrow();
  });

  it("is due once the configured local time arrives", () => {
    const before = new Date("2026-09-06T17:29:59.000Z");
    const after = new Date("2026-09-06T17:30:00.000Z");
    expect(isDailyBackupDue(before, "17:30", "UTC")).toBe(false);
    expect(isDailyBackupDue(after, "17:30", "UTC")).toBe(true);
  });
});
