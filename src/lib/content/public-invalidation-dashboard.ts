import type { Prisma, PrismaClient } from "@prisma/client";

export async function getPublicInvalidationDashboard(client: PrismaClient) {
  const retainedWhere: Prisma.PublicInvalidationWhereInput = { status: { in: ["PENDING", "FAILED"] } };
  const [grouped, recent, oldestPending, latestSuccess] = await Promise.all([
    client.publicInvalidation.groupBy({ where: retainedWhere, by: ["status"], _count: { _all: true } }),
    client.publicInvalidation.findMany({ where: retainedWhere, orderBy: { createdAt: "desc" }, take: 20 }),
    client.publicInvalidation.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    client.publicInvalidation.findFirst({ where: { status: "SUCCESS", completedAt: { not: null } }, orderBy: { completedAt: "desc" }, select: { completedAt: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map(({ status, _count }) => [status, _count?._all ?? 0]));
  return { counts, recent, oldestPending: oldestPending?.createdAt ?? null, latestSuccess: latestSuccess?.completedAt ?? null };
}
