import { describe, expect, it } from "vitest";
import { parseGa4ReportRows } from "./ga4-sync";

describe("parseGa4ReportRows", () => {
  it("maps GA4 dimension and metric headers without depending on column order", () => {
    const rows = parseGa4ReportRows({ dimensionHeaders: [{ name: "pagePath" }, { name: "date" }], metricHeaders: [{ name: "activeUsers" }, { name: "screenPageViews" }], rows: [{ dimensionValues: [{ value: "/zh-tw/articles/test" }, { value: "20260905" }], metricValues: [{ value: "7" }, { value: "12" }] }] });
    expect(rows).toEqual([{ pagePath: "/zh-tw/articles/test", date: "20260905", activeUsers: 7, screenPageViews: 12 }]);
  });
});
