import { describe, expect, it, vi } from "vitest";

import { completePublicInvalidation } from "./public-invalidation-outbox";

describe("public invalidation outbox", () => {
  it("retains a successful event with its completion time", async () => {
    const updateMock = vi.fn(async () => ({ id: "event-1", status: "SUCCESS" }));
    const completedAt = new Date("2026-09-07T02:03:00.000Z");
    await completePublicInvalidation({ publicInvalidation: { update: updateMock } } as never, "event-1", completedAt);

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { status: "SUCCESS", completedAt },
    });
  });
});
