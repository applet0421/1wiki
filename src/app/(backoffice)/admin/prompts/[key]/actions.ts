"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePromptKey } from "@/lib/ai/prompt-definitions";
import { createPromptVersion, restorePromptVersion } from "@/lib/ai/prompt-repository";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

async function requireOwnerForAction() {
  return assertOwner(await getCurrentUser());
}

function versionNumber(value: FormDataEntryValue | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("Prompt 版本不正確。");
  return parsed;
}

function publicPromptError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Prompt 更新失敗。";
  return message.length <= 160 ? message : "Prompt 更新失敗。";
}

export async function savePromptAction(key: string, formData: FormData) {
  const owner = await requireOwnerForAction();
  const promptKey = parsePromptKey(key);
  try {
    await createPromptVersion(prisma, {
      key: promptKey,
      baseVersionNumber: versionNumber(formData.get("baseVersionNumber")),
      systemTemplate: String(formData.get("systemTemplate") || ""),
      userTemplate: String(formData.get("userTemplate") || ""),
      createdById: owner.id,
    });
  } catch (error) {
    redirect(`/admin/prompts/${encodeURIComponent(key)}?error=${encodeURIComponent(publicPromptError(error))}`);
  }
  revalidatePath("/admin/prompts");
  revalidatePath(`/admin/prompts/${key}`);
  redirect(`/admin/prompts/${encodeURIComponent(key)}?success=saved`);
}

export async function restorePromptAction(key: string, formData: FormData) {
  const owner = await requireOwnerForAction();
  const promptKey = parsePromptKey(key);
  try {
    await restorePromptVersion(prisma, {
      key: promptKey,
      sourceVersionNumber: versionNumber(formData.get("sourceVersionNumber")),
      baseVersionNumber: versionNumber(formData.get("baseVersionNumber")),
      createdById: owner.id,
    });
  } catch (error) {
    redirect(`/admin/prompts/${encodeURIComponent(key)}?error=${encodeURIComponent(publicPromptError(error))}`);
  }
  revalidatePath("/admin/prompts");
  revalidatePath(`/admin/prompts/${key}`);
  redirect(`/admin/prompts/${encodeURIComponent(key)}?success=restored`);
}
