"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
export type WorkerControlAction = "start" | "restart" | "stop";

export async function controlWorkerAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  const action = String(formData.get("action") || "") as WorkerControlAction;
  if (!["start", "restart", "stop"].includes(action)) redirect("/admin/worker?error=無效的 Worker 操作");
  const worker = String(formData.get("worker") || "image");
  const workerId = worker === "search-engine" ? "search-engine-worker" : "image-worker";
  const workerName = workerId === "search-engine-worker" ? "Search engine notification worker" : "AI image worker";
  try {
    await prisma.workerHeartbeat.upsert({
      where: { id: workerId },
      create: { id: workerId, name: workerName, desiredState: action === "stop" ? "STOPPED" : "RUNNING", startedAt: new Date(), lastHeartbeat: new Date() },
      update: { desiredState: action === "stop" ? "STOPPED" : "RUNNING", lastError: null },
    });
    revalidatePath("/admin/worker");
  } catch { redirect(`/admin/worker?error=${encodeURIComponent(`Worker ${action} 操作失敗`)}`); }
  redirect(`/admin/worker?success=${action}`);
}

export async function retryWorkerJobAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  const id = String(formData.get("id") || "").trim();
  await prisma.imageGeneration.updateMany({ where: { id, status: "FAILED", imageBytes: { not: null } }, data: { status: "GENERATED", error: null } });
  revalidatePath("/admin/worker");
  redirect("/admin/worker");
}
