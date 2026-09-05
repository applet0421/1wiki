import { describe, expect, it } from "vitest";
import { parseTrafficFilters } from "./traffic-query";

describe("parseTrafficFilters", () => {
  it("defaults to the latest 30 Taiwan calendar days", () => {
    const filters = parseTrafficFilters({}, new Date("2026-09-06T04:00:00+08:00"));
    expect(filters.from.toISOString().slice(0, 10)).toBe("2026-08-08");
    expect(filters.to.toISOString().slice(0, 10)).toBe("2026-09-06");
  });

  it("accepts valid date and locale filters and rejects invalid values", () => {
    const filters = parseTrafficFilters({ from: "2026-09-01", to: "2026-09-05", locale: "en" }, new Date("2026-09-06T00:00:00Z"));
    expect(filters.locale).toBe("en");
    expect(parseTrafficFilters({ locale: "xx" }, new Date("2026-09-06T00:00:00Z")).locale).toBeUndefined();
  });
});
