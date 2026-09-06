const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateBackupSettings(input: { dailyTime: string; timezone: string; retentionCount: number }) {
  if (!timePattern.test(input.dailyTime)) throw new Error("每日備份時間格式必須為 HH:mm");
  if (!Number.isInteger(input.retentionCount) || input.retentionCount < 1 || input.retentionCount > 365) throw new Error("保留數量必須介於 1 至 365");
  try { new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format(); } catch { throw new Error("時區格式不正確"); }
  return input;
}

export function getLocalScheduleParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function isDailyBackupDue(now: Date, dailyTime: string, timezone: string) {
  return getLocalScheduleParts(now, timezone).time >= dailyTime;
}

export function scheduleKeyFor(now: Date, timezone: string) {
  return `daily:${getLocalScheduleParts(now, timezone).date}`;
}
