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
});
