import { prisma } from "@/lib/db/prisma";

export async function resetDatabase() {
  await prisma.lLMUsage.deleteMany();
  await prisma.lLMModelPrice.deleteMany();
  await prisma.promptVersion.deleteMany({ where: { versionNumber: { gt: 1 } } });
  await prisma.session.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}
