import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, upsert, revalidatePath, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  upsert: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { dataRetentionSetting: { upsert } } }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

import { saveRetentionSettingsAction } from "./actions";

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    llmUsageDays: 180, trafficSyncRunDays: 180,
    searchSuccessDays: 90, searchFailureDays: 365, imageGenerationDays: 90, publicInvalidationDays: 180,
    databaseBackupFailureDays: 30,
  })) form.set(key, String(value));
  return form;
}

describe("retention settings action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ role: "OWNER" });
  });

  it("saves all retention days for an owner", async () => {
    await expect(saveRetentionSettingsAction(validForm())).rejects.toThrow("redirect:/admin/database-backups?success=retention-settings");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "default" },
      update: expect.objectContaining({ llmUsageDays: 180, trafficSyncRunDays: 180, databaseBackupFailureDays: 30 }),
    }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/database-backups");
  });

  it("rejects an invalid retention day", async () => {
    const form = validForm();
    form.set("llmUsageDays", "0");
    await expect(saveRetentionSettingsAction(form)).rejects.toThrow(/llmUsageDays/);
    expect(upsert).not.toHaveBeenCalled();
  });
});
