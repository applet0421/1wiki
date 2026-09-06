"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function retryPublicInvalidationsAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  await prisma.publicInvalidation.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING", nextAttemptAt: new Date(), lastError: null },
  });
  revalidatePath("/admin/cache");
  redirect("/admin/cache?success=retried");
}
