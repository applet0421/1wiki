import { describe, expect, it, vi } from "vitest";

import { runDataRetentionCleanup } from "./cleanup";
import { DEFAULT_RETENTION_SETTINGS } from "./settings";

describe("data retention cleanup", () => {
  it("uses retention cutoffs and only deletes eligible records", async () => {
    const client = {
      lLMUsage: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      trafficSyncRun: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      searchEngineNotification: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      imageGeneration: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      publicInvalidation: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      session: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      databaseBackup: { deleteMany: vi.fn(async () => ({ count: 1 })) },
      weChatImport: { updateMany: vi.fn(async () => ({ count: 1 })) },
      weChatImportAsset: { updateMany: vi.fn(async () => ({ count: 1 })) },
    };
    const now = new Date("2026-09-06T00:00:00.000Z");

    const result = await runDataRetentionCleanup(client as never, DEFAULT_RETENTION_SETTINGS, now);

    expect(client.lLMUsage.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-03-10T00:00:00.000Z") } } });
    expect(client.trafficSyncRun.deleteMany).toHaveBeenCalledWith({ where: { startedAt: { lt: new Date("2026-03-10T00:00:00.000Z") }, status: { in: ["SUCCESS", "FAILURE"] } } });
    expect(client.searchEngineNotification.deleteMany).toHaveBeenCalledTimes(2);
    expect(client.imageGeneration.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-06-08T00:00:00.000Z") }, status: { in: ["READY", "FAILED"] }, imageBytes: null } });
    expect(client.publicInvalidation.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-03-10T00:00:00.000Z") }, status: { in: ["SUCCESS", "FAILED"] } } });
    expect(client.session.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } });
    expect(client.weChatImport.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ["FETCHED", "REWRITTEN", "FAILED", "UNKNOWN", "TRANSFER_FAILED", "ABANDONED"] } }) }));
    expect(client.weChatImportAsset.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { imageBytes: null, originalUrl: "" } }));
    expect(result.weChatImportPayloads).toBe(2);
    expect(result.totalDeleted).toBe(8);
  });

  it("does not delete pending or running jobs, while allowing expired unknown imports to be scrubbed", async () => {
    const deleteMany = vi.fn(async () => ({ count: 0 }));
    const client = {
      lLMUsage: { deleteMany },
      trafficSyncRun: { deleteMany }, searchEngineNotification: { deleteMany }, imageGeneration: { deleteMany },
      publicInvalidation: { deleteMany }, session: { deleteMany }, databaseBackup: { deleteMany },
      weChatImport: { updateMany: deleteMany }, weChatImportAsset: { updateMany: deleteMany },
    };

    await runDataRetentionCleanup(client as never, DEFAULT_RETENTION_SETTINGS, new Date("2026-09-06T00:00:00.000Z"));

    for (const call of deleteMany.mock.calls as unknown as Array<[unknown]>) expect(JSON.stringify(call[0])).not.toMatch(/PENDING/);
  });
});
