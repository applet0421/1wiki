import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSettings, cleanup } = vi.hoisted(() => ({ getSettings: vi.fn(), cleanup: vi.fn() }));

vi.mock("@/lib/retention/settings", () => ({ getOrCreateRetentionSettings: getSettings }));
vi.mock("@/lib/retention/cleanup", () => ({ runDataRetentionCleanup: cleanup }));

import { runRetentionCleanupIfDue, type RetentionCycleState } from "./worker-cycle";

describe("backup worker retention cycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue({ llmUsageDays: 180 });
    cleanup.mockResolvedValue({ totalDeleted: 4 });
  });

  it("runs cleanup once and returns its summary", async () => {
    const state = { lastCleanupAt: null as Date | null };
    const now = new Date("2026-09-06T00:00:00.000Z");

    const result = await runRetentionCleanupIfDue({} as never, state, now);

    expect(cleanup).toHaveBeenCalledWith({}, { llmUsageDays: 180 }, now);
    expect(result).toEqual({ ran: true, summary: { totalDeleted: 4 } });
    expect(state.lastCleanupAt).toBe(now);
  });

  it("skips cleanup within 24 hours and contains failures", async () => {
    const state: RetentionCycleState = { lastCleanupAt: new Date("2026-09-05T12:00:00.000Z") };
    const now = new Date("2026-09-06T00:00:00.000Z");
    cleanup.mockRejectedValueOnce(new Error("database unavailable"));

    expect(await runRetentionCleanupIfDue({} as never, state, now)).toEqual({ ran: false });
    state.lastCleanupAt = null;
    await expect(runRetentionCleanupIfDue({} as never, state, now)).resolves.toEqual({ ran: true, error: expect.any(Error) });
  });
});
