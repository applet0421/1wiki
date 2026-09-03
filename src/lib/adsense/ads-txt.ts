export function buildAdsTxt(publisherId: string | undefined): string | null {
  const id = publisherId?.trim() || "";
  if (!/^pub-[0-9]+$/.test(id)) return null;
  return `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`;
}
