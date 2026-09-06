import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { getCurrentUser, getOrCreateBackupSettings, getOrCreateRetentionSettings, listDatabaseBackups } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getOrCreateBackupSettings: vi.fn(),
  getOrCreateRetentionSettings: vi.fn(),
  listDatabaseBackups: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/backup/repository", () => ({ getOrCreateBackupSettings, listDatabaseBackups, serializeBackup: (row: unknown) => row }));
vi.mock("@/lib/retention/settings", () => ({ getOrCreateRetentionSettings }));
vi.mock("./actions", () => ({ createManualBackupAction: vi.fn(), downloadBackupAction: vi.fn(), saveBackupSettingsAction: vi.fn(), saveRetentionSettingsAction: vi.fn() }));

import DatabaseBackupsPage from "./page";

describe("database backups page", () => {
  it("renders configurable retention fields", async () => {
    getCurrentUser.mockResolvedValue({ role: "OWNER" });
    getOrCreateBackupSettings.mockResolvedValue({ enabled: true, dailyTime: "02:00", timezone: "Asia/Taipei", retentionCount: 7 });
    getOrCreateRetentionSettings.mockResolvedValue({
      llmUsageDays: 180, trafficDailyPageDays: 365, trafficDailySiteDays: 730, trafficSyncRunDays: 180,
      searchSuccessDays: 90, searchFailureDays: 365, imageGenerationDays: 90, publicInvalidationDays: 180,
      databaseBackupFailureDays: 30,
    });
    listDatabaseBackups.mockResolvedValue([]);

    render(await DatabaseBackupsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "資料清理保留期限" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /^LLM 用量/ })).toHaveValue(180);
    expect(screen.getByRole("spinbutton", { name: /^AI 配圖任務/ })).toHaveValue(90);
  });
});
