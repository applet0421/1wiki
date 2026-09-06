import { describe, expect, it } from "vitest";
import { parseUsageFilters } from "./usage-query";

describe("LLM usage filters", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("defaults to the latest 30 days and first page", () => {
    const filters = parseUsageFilters({}, now);
    expect(filters.from.toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(filters.to.toISOString()).toBe("2026-09-04T23:59:59.999Z");
    expect(filters).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("includes the complete selected end date", () => {
    const filters = parseUsageFilters({ from: "2026-09-01", to: "2026-09-02", status: "FAILURE", page: "3" }, now);
    expect(filters.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(filters.to.toISOString()).toBe("2026-09-02T23:59:59.999Z");
    expect(filters).toMatchObject({ status: "FAILURE", page: 3 });
  });

  it("ignores malformed and unbounded values", () => {
    const filters = parseUsageFilters({ from: "nope", status: "BROKEN", page: "-8", provider: " p ".repeat(100) }, now);
    expect(filters.status).toBeUndefined();
    expect(filters.page).toBe(1);
    expect(filters.provider).toBeUndefined();
  });
});
