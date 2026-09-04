"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { authenticateUser } from "@/lib/auth/login";
import { createUserSession, deleteCurrentSession } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  let user;
  try {
    user = await authenticateUser(prisma, username, password);
  } catch {
    redirect("/login?error=invalid");
  }
  await createUserSession(user.id);
  redirect(user.mustChangePassword ? "/change-password" : "/admin");
}

export async function logoutAction() {
  await deleteCurrentSession();
  redirect("/login");
}
