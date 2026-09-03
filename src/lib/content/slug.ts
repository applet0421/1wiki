export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("zh-Hant-TW")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
