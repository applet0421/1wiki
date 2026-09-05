import { describe, expect, it } from "vitest";
import { getAnalyticsConfig } from "./config";

describe("getAnalyticsConfig", () => {
  it("enables tracking only for a valid public GA4 measurement ID", () => {
    expect(getAnalyticsConfig({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-ABC12345", NODE_ENV: "production" })).toEqual({ measurementId: "G-ABC12345", enabled: true });
    expect(getAnalyticsConfig({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: "UA-123", NODE_ENV: "production" }).enabled).toBe(false);
    expect(getAnalyticsConfig({ NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-ABC12345", NODE_ENV: "development" }).enabled).toBe(false);
  });
});
