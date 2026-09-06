import type { PrismaClient } from "@prisma/client";
import { buildPublicInvalidationPaths, type PublicInvalidationInput } from "./public-invalidation";

export async function enqueuePublicInvalidation(client: PrismaClient, input: PublicInvalidationInput) {
  const paths = buildPublicInvalidationPaths(input);
  return client.publicInvalidation.create({ data: { paths } });
}

export async function completePublicInvalidation(client: PrismaClient, id: string) {
  return client.publicInvalidation.delete({ where: { id } });
}
