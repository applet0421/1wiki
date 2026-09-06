import type { PrismaClient } from "@prisma/client";

export async function getPublicInvalidationDashboard(client: PrismaClient) {
  const [grouped, recent, oldestPending] = await Promise.all([
    client.publicInvalidation.groupBy({ by: ["status"], _count: { _all: true } }),
    client.publicInvalidation.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    client.publicInvalidation.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map(({ status, _count }) => [status, _count._all]));
  return { counts, recent, oldestPending: oldestPending?.createdAt ?? null };
}
