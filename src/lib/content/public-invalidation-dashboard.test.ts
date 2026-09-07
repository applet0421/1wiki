import { describe, expect, it, vi } from "vitest";

import { getPublicInvalidationDashboard } from "./public-invalidation-dashboard";

describe("public invalidation dashboard", () => {
  it("queries only pending and failed events for the retained event view", async () => {
    const groupBy = vi.fn(async () => [{ status: "FAILED", _count: { _all: 2 } }]);
    const findMany = vi.fn(async () => []);
    const findFirst = vi.fn(async () => null);

    await getPublicInvalidationDashboard({ publicInvalidation: { groupBy, findMany, findFirst } } as never);

    const retainedStatuses = { in: ["PENDING", "FAILED"] };
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { status: retainedStatuses } }));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: retainedStatuses } }));
  });

  it("returns the most recent successful completion time", async () => {
    const findFirst = vi.fn(async (args: { where?: unknown }) => (args.where as { status?: string } | undefined)?.status === "SUCCESS"
      ? { completedAt: new Date("2026-09-07T02:03:00.000Z") }
      : null);

    const dashboard = await getPublicInvalidationDashboard({
      publicInvalidation: {
        groupBy: vi.fn(async () => []),
        findMany: vi.fn(async () => []),
        findFirst,
      },
    } as never);

    expect(findFirst).toHaveBeenCalledWith({
      where: { status: "SUCCESS", completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
    expect(dashboard.latestSuccess).toEqual(new Date("2026-09-07T02:03:00.000Z"));
  });
});
