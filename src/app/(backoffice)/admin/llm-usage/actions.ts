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
  imageOutputRate: z.coerce.number().positive().finite().nullable(),
  effectiveAt: z.coerce.date(),
});
const modelPriceIdSchema = z.string().trim().min(1).max(191);

function message(error: unknown): string {
  if (error instanceof z.ZodError) return "請填寫有效的供應商、模型、正數費率與生效時間。";
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "相同模型與生效時間的費率已存在。";
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return "找不到指定模型費率。";
  return "模型費率儲存失敗。";
}

function parseModelPrice(formData: FormData) {
  const inputRate = String(formData.get("inputRate") || "").trim();
  const outputRate = String(formData.get("outputRate") || "").trim();
  const imageOutputRate = String(formData.get("imageOutputRate") || "").trim();
  const parsed = modelPriceSchema.parse({
    provider: String(formData.get("provider") || "").trim().toLowerCase(),
    model: String(formData.get("model") || ""),
    inputRate,
    outputRate,
    imageOutputRate: imageOutputRate || null,
    effectiveAt: String(formData.get("effectiveAt") || ""),
  });
  return {
    parsed,
    data: {
      provider: parsed.provider,
      model: parsed.model,
      inputUsdPerMillionTokens: new Prisma.Decimal(inputRate),
      outputUsdPerMillionTokens: new Prisma.Decimal(outputRate),
      imageOutputUsdPerMillionTokens: imageOutputRate ? new Prisma.Decimal(imageOutputRate) : null,
      effectiveAt: parsed.effectiveAt,
    },
  };
}

export async function createModelPriceAction(formData: FormData) {
  const owner = assertOwner(await getCurrentUser());
  try {
    const { data } = parseModelPrice(formData);
    await prisma.lLMModelPrice.create({
      data: {
        ...data,
        createdById: owner.id,
      },
    });
  } catch (error) {
    redirect(`/admin/llm-usage?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/admin/llm-usage");
  redirect("/admin/llm-usage?success=price-created");
}

export async function updateModelPriceAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  try {
    const id = modelPriceIdSchema.parse(String(formData.get("id") || ""));
    const { data } = parseModelPrice(formData);
    await prisma.lLMModelPrice.update({ where: { id }, data });
  } catch (error) {
    redirect(`/admin/llm-usage?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/admin/llm-usage");
  redirect("/admin/llm-usage?success=price-updated");
}

export async function deleteModelPriceAction(formData: FormData) {
  assertOwner(await getCurrentUser());
  try {
    const id = modelPriceIdSchema.parse(String(formData.get("id") || ""));
    await prisma.lLMModelPrice.delete({ where: { id } });
  } catch (error) {
    redirect(`/admin/llm-usage?error=${encodeURIComponent(message(error))}`);
  }
  revalidatePath("/admin/llm-usage");
  redirect("/admin/llm-usage?success=price-deleted");
}
