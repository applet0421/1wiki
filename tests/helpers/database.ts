import { prisma } from "@/lib/db/prisma";

export async function resetDatabase() {
  await prisma.session.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
}
