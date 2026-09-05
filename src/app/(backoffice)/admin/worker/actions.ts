"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
export type WorkerControlAction = "start" | "restart" | "stop";
function commandFor(action: WorkerControlAction) { return process.env[`WORKER_${action.toUpperCase()}_COMMAND`]?.trim(); }

export async function controlWorkerAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  const action = String(formData.get("action") || "") as WorkerControlAction;
  if (!["start", "restart", "stop"].includes(action)) redirect("/admin/worker?error=無效的 Worker 操作");
  const command = commandFor(action);
  if (!command) redirect(`/admin/worker?error=${encodeURIComponent(`尚未配置 WORKER_${action.toUpperCase()}_COMMAND`)}`);
  try {
    if (action === "start" || action === "restart") {
      const child = spawn(command, { shell: true, detached: true, stdio: "ignore" });
      child.unref();
    } else await execAsync(command, { timeout: 15000, maxBuffer: 20000 });
    revalidatePath("/admin/worker"); redirect(`/admin/worker?success=${action}`);
  }
  catch { redirect(`/admin/worker?error=${encodeURIComponent(`Worker ${action} 操作失敗`)}`); }
}

export async function retryWorkerJobAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  const id = String(formData.get("id") || "").trim();
  await prisma.imageGeneration.updateMany({ where: { id, status: "FAILED", imageBytes: { not: null } }, data: { status: "GENERATED", error: null } });
  revalidatePath("/admin/worker");
  redirect("/admin/worker");
}
