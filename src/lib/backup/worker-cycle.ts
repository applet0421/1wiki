import type { PrismaClient } from "@prisma/client";
import { runDataRetentionCleanup, type CleanupSummary } from "@/lib/retention/cleanup";
import { getOrCreateRetentionSettings } from "@/lib/retention/settings";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type RetentionCycleState = { lastCleanupAt: Date | null };
export type RetentionCycleResult = { ran: true; summary?: CleanupSummary; error?: unknown } | { ran: false };

export async function runRetentionCleanupIfDue(client: PrismaClient, state: RetentionCycleState, now = new Date()): Promise<RetentionCycleResult> {
  if (state.lastCleanupAt && now.getTime() - state.lastCleanupAt.getTime() < CLEANUP_INTERVAL_MS) return { ran: false };
  state.lastCleanupAt = now;
  try {
    const settings = await getOrCreateRetentionSettings(client);
    const summary = await runDataRetentionCleanup(client, settings, now);
    return { ran: true, summary };
  } catch (error) {
    return { ran: true, error };
  }
}
