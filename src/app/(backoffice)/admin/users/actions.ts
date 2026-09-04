"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createManagedUser, resetManagedPassword, updateManagedUser } from "@/lib/auth/accounts";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

async function requireOwnerForAction() {
  return assertOwner(await getCurrentUser());
}

export async function createUserAction(formData: FormData) {
  await requireOwnerForAction();
  try {
    await createManagedUser(prisma, {
      username: String(formData.get("username") || ""),
      displayName: String(formData.get("displayName") || ""),
      temporaryPassword: String(formData.get("temporaryPassword") || ""),
      role: formData.get("role") === "OWNER" ? "OWNER" : "EDITOR",
    });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Unique")
      ? "帳號已存在"
      : "帳號資料不正確";
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?success=created");
}

export async function updateUserAction(formData: FormData) {
  await requireOwnerForAction();
  const id = String(formData.get("id") || "");
  try {
    await updateManagedUser(prisma, id, {
      displayName: String(formData.get("displayName") || ""),
      role: formData.get("role") === "OWNER" ? "OWNER" : "EDITOR",
      isActive: formData.get("isActive") === "true",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "帳號更新失敗";
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?success=updated");
}

export async function resetPasswordAction(formData: FormData) {
  await requireOwnerForAction();
  try {
    await resetManagedPassword(
      prisma,
      String(formData.get("id") || ""),
      String(formData.get("temporaryPassword") || ""),
    );
  } catch {
    redirect("/admin/users?error=密碼重設失敗");
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?success=reset");
}
