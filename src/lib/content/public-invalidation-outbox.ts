import type { PrismaClient } from "@prisma/client";
import { buildPublicInvalidationPaths, type PublicInvalidationInput } from "./public-invalidation";

export async function enqueuePublicInvalidation(client: PrismaClient, input: PublicInvalidationInput) {
  const paths = buildPublicInvalidationPaths(input);
  return client.publicInvalidation.create({ data: { paths } });
}
