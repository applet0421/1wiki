"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { changeOwnPassword } from "@/lib/auth/accounts";
import { createUserSession, deleteCurrentSession, getCurrentUser } from "@/lib/auth/session";

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (newPassword !== confirmation) redirect("/change-password?error=mismatch");

  try {
    await changeOwnPassword(prisma, user.id, currentPassword, newPassword);
  } catch {
    redirect("/change-password?error=invalid");
  }
  await deleteCurrentSession();
  await createUserSession(user.id);
  redirect("/admin");
}
