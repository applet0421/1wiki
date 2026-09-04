import { beforeEach, describe, expect, it, vi } from "vitest";
import { createModelPriceAction } from "./actions";

const { getCurrentUser, create, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  create: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { lLMModelPrice: { create } } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect }));

function validForm() {
  const form = new FormData();
  form.set("provider", "openai");
  form.set("model", " gpt-5 ");
  form.set("inputRate", "0.15");
  form.set("outputRate", "0.60");
  form.set("effectiveAt", "2026-09-04T12:00");
  return form;
}

describe("createModelPriceAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects editors before validating or writing rates", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "editor", role: "EDITOR", isActive: true });
    await expect(createModelPriceAction(validForm())).rejects.toThrow("權限不足");
    expect(create).not.toHaveBeenCalled();
  });

  it("stores exact decimal strings for an owner", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "owner", role: "OWNER", isActive: true });
    create.mockResolvedValueOnce({ id: "price-1" });
    await expect(createModelPriceAction(validForm())).rejects.toThrow("redirect:/admin/llm-usage?success=price-created");
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ provider: "openai", model: "gpt-5", createdById: "owner" });
    expect(data.inputUsdPerMillionTokens.toString()).toBe("0.15");
    expect(data.outputUsdPerMillionTokens.toString()).toBe("0.6");
  });

  it("rejects invalid non-positive rates", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "owner", role: "OWNER", isActive: true });
    const form = validForm();
    form.set("inputRate", "0");
    await expect(createModelPriceAction(form)).rejects.toThrow(/redirect:\/admin\/llm-usage\?error=/);
    expect(create).not.toHaveBeenCalled();
  });
});
