export const siteConfig = {
  name: "1Wiki｜AI、軟體、3C 使用教學與疑難解答",
  shortName: "1Wiki",
  description: "用清楚、可操作的步驟，解決 AI、軟體、社群與 3C 的日常問題。",
  locale: "zh-Hant-TW",
} as const;

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const value = configuredUrl || "http://localhost:3000";
  return value.replace(/\/+$/, "");
}
