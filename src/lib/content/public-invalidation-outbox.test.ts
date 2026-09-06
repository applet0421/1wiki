import { describe, expect, it, vi } from "vitest";

import { completePublicInvalidation } from "./public-invalidation-outbox";

describe("public invalidation outbox", () => {
  it("removes an event after successful processing instead of retaining a success row", async () => {
    const deleteMock = vi.fn(async () => ({ id: "event-1" }));
    await completePublicInvalidation({ publicInvalidation: { delete: deleteMock } } as never, "event-1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });
});
