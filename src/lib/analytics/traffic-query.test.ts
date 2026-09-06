import { describe, expect, it } from "vitest";
import { getTrafficDashboard, parseTrafficFilters } from "./traffic-query";

describe("parseTrafficFilters", () => {
  it("keeps only the supported locale filter", () => {
    expect(parseTrafficFilters({}).locale).toBeUndefined();
  });

  it("accepts valid locale filters and rejects invalid values", () => {
    const filters = parseTrafficFilters({ locale: "en" });
    expect(filters.locale).toBe("en");
    expect(parseTrafficFilters({ locale: "xx" }).locale).toBeUndefined();
  });
});

describe("getTrafficDashboard", () => {
  it("reads page totals without querying daily traffic tables", async () => {
    const client = {
      trafficPageTotal: {
        findMany: async () => [
          { pagePath: "/en/articles/one", pageTitle: "One", pageType: "article", locale: "en", views: 12, post: { id: "p1", title: "One" }, category: { id: "c1", name: "Guides" } },
          { pagePath: "/en/category/guides", pageTitle: "Guides", pageType: "category", locale: "en", views: 8, post: null, category: { id: "c1", name: "Guides" } },
        ],
      },
      trafficSyncRun: { findFirst: async () => ({ status: "SUCCESS" }) },
    };
    const dashboard = await getTrafficDashboard(client as never);
    expect(dashboard.totals).toEqual({ views: 20 });
    expect(dashboard.posts).toEqual([{ id: "p1", title: "One", views: 12 }]);
    expect(dashboard.categories).toEqual([{ id: "c1", name: "Guides", views: 20 }]);
    expect(dashboard).not.toHaveProperty("daily");
  });
});
