import { describe, expect, it } from "vitest";
import { aggregatePageTrafficRows, parseGa4ReportRows } from "./ga4-sync";

describe("parseGa4ReportRows", () => {
  it("maps GA4 dimension and metric headers without depending on column order", () => {
    const rows = parseGa4ReportRows({ dimensionHeaders: [{ name: "pagePath" }, { name: "date" }], metricHeaders: [{ name: "activeUsers" }, { name: "screenPageViews" }], rows: [{ dimensionValues: [{ value: "/zh-tw/articles/test" }, { value: "20260905" }], metricValues: [{ value: "7" }, { value: "12" }] }] });
    expect(rows).toEqual([{ pagePath: "/zh-tw/articles/test", date: "20260905", activeUsers: 7, screenPageViews: 12 }]);
  });
});

describe("aggregatePageTrafficRows", () => {
  it("keeps one cumulative page row and sums repeated paths", () => {
    expect(aggregatePageTrafficRows([
      { pagePath: "/en/articles/one", pageTitle: "One", screenPageViews: 4 },
      { pagePath: "/en/articles/one", pageTitle: "One", screenPageViews: 6 },
      { pagePath: "/en/category/guides", pageTitle: "Guides", screenPageViews: 3 },
    ])).toEqual([
      { pagePath: "/en/articles/one", pageTitle: "One", views: 10 },
      { pagePath: "/en/category/guides", pageTitle: "Guides", views: 3 },
    ]);
  });
});
