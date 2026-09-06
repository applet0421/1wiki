import { prisma } from "@/lib/db/prisma";

export async function resetDatabase() {
  await prisma.publicInvalidation.deleteMany();
  await prisma.lLMUsage.deleteMany();
  await prisma.lLMModelPrice.deleteMany();
  await prisma.promptDefinition.updateMany({ data: { activeVersionNumber: 1 } });
  await prisma.promptVersion.deleteMany({ where: { versionNumber: { gt: 1 } } });
  await prisma.session.deleteMany();
  await prisma.post.deleteMany();
  await prisma.sitePage.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}
