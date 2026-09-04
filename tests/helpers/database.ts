import { prisma } from "@/lib/db/prisma";

export async function resetDatabase() {
  await prisma.llmUsage.deleteMany();
  await prisma.llmModelPrice.deleteMany();
  await prisma.promptVersion.deleteMany({ where: { versionNumber: { gt: 1 } } });
  await prisma.session.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}
