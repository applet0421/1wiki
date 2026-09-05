export type AnalyticsEnvironment = Record<string, string | undefined>;

export function getAnalyticsConfig(env: AnalyticsEnvironment = process.env) {
  const measurementId = env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim().toUpperCase() || "";
  return { measurementId, enabled: env.NODE_ENV === "production" && /^G-[A-Z0-9]+$/.test(measurementId) };
}
