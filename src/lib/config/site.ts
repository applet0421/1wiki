export const siteConfig = {
  shortName: "1Wiki",
} as const;

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const value = configuredUrl || "http://localhost:3000";
  return value.replace(/\/+$/, "");
}
