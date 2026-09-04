"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertOwner } from "@/lib/auth/authorize";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const modelPriceSchema = z.object({
  provider: z.enum(["openai", "gemini", "deepseek"]),
  model: z.string().trim().min(1).max(120),
  inputRate: z.coerce.number().positive().finite(),
  outputRate: z.coerce.number().positive().finite(),
  effectiveAt: z.coerce.date(),
});

function message(error: unknown): string {
  if (error instanceof z.ZodError) return "請填寫有效的供應商、模型、正數費率與生效時間。";
  if (error instanceof Error && error.message.includes("Unique")) return "相同模型與生效時間的費率已存在。";
  return "模型費率儲存失敗。";
}

export async function createModelPriceAction(formData: FormData) {
  const owner = assertOwner(await getCurrentUser());
  const rawInputRate = String(formData.get("inputRate") || "").trim();
  const rawOutputRate = String(formData.get("outputRate") || "").trim();
  try {
    const parsed = modelPriceSchema.parse({
      provider: String(formData.get("provider") || "").trim().toLowerCase(),
      model: String(formData.get("model") || ""),
      inputRate: rawInputRate,
      outputRate: rawOutputRate,
      effectiveAt: String(formData.get("effectiveAt") || ""),
    });
    await prisma.lLMModelPrice.create({
      data: {
        provider: parsed.provider,
        model: parsed.model,
        inputUsdPerMillionTokens: new Prisma.Decimal(rawInputRate),
        outputUsdPerMillionTokens: new Prisma.Decimal(rawOutputRate),
        effectiveAt: parsed.effectiveAt,
        createdById: owner.id,
      },
    });
  } catch (error) {
    redirect(`/admin/llm-usage?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/admin/llm-usage");
  redirect("/admin/llm-usage?success=price-created");
}
