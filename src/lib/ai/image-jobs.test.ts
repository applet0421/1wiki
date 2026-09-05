// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./execute-llm", () => ({ executeLLMCall: vi.fn() }));
import { executeLLMCall } from "./execute-llm";
import { prisma } from "@/lib/db/prisma";
import { planArticleImage } from "./image-jobs";
const input = { title: "未儲存的新標題", locale: "zh-tw", paragraphs: [{ id: "p1", text: "未儲存的新段落", tag: "p" }] };
const plan = { targetId: "p1", prompt: "Illustrate the concept", alt: "概念示意圖", reason: "說明概念" };
const userIds: string[] = [];
async function user() {
  for (const key of ["GEMINI_API_KEY", "CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY"]) vi.stubEnv(key, "test");
  vi.stubEnv("R2_PUBLIC_BASE_URL", "https://images.example.com");
  const value = await prisma.user.create({ data: { username: randomUUID(), displayName: "Image planning", passwordHash: "test" } });
  userIds.push(value.id); return value.id;
}
afterEach(async () => { await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } }); vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("atomically reserves the daily budget before concurrent paid planning calls", async () => {
  const userId = await user();
  await prisma.imageGeneration.createMany({ data: Array.from({ length: 49 }, () => ({ userId, locale: "zh-tw", title: "prior", paragraphs: input.paragraphs, ...plan, model: "gemini-3.1-flash-image", imageSize: "512", aspectRatio: "9:16", altModel: "gemini-3.1-flash-lite", status: "FAILED" })) });
  vi.mocked(executeLLMCall).mockResolvedValue(plan);
  const results = await Promise.allSettled([planArticleImage(prisma, userId, input), planArticleImage(prisma, userId, input)]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(executeLLMCall).toHaveBeenCalledTimes(1);
  const variables = vi.mocked(executeLLMCall).mock.calls[0][0].variables;
  expect(variables.title).toBe(input.title);
  expect(JSON.parse(variables.paragraphs)).toEqual(input.paragraphs);
  expect(await prisma.imageGeneration.count({ where: { userId } })).toBe(50);
});
it("counts failed planning attempts and never accepts an invented paragraph target", async () => {
  const userId = await user();
  vi.mocked(executeLLMCall).mockResolvedValue({ ...plan, targetId: "invented" });
  await expect(planArticleImage(prisma, userId, input)).rejects.toThrow("有效的正文段落");
  expect(await prisma.imageGeneration.findFirst({ where: { userId }, select: { status: true } })).toEqual({ status: "FAILED" });
});
