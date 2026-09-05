import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { AIProviderError } from "./errors";

export async function imageApiUser(request: Request) {
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "不允許跨網站配圖請求" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  if (user.mustChangePassword) return Response.json({ error: "請先變更密碼" }, { status: 403 });
  return user;
}
export async function readImageJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("請使用 JSON 格式");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("請提供配圖資料");
  const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 500000) { await reader.cancel(); throw new Error("配圖內容過長"); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Error("配圖資料格式不正確"); }
}
export function imageApiError(error: unknown) {
  if (error instanceof z.ZodError) return Response.json({ error: "請確認標題、正文段落、Prompt 與 alt 的格式及長度。" }, { status: 400 });
  if (error instanceof AIProviderError) return Response.json({ error: error.message }, { status: 502 });
  const text = error instanceof Error ? error.message : "";
  const expected = /^(尚未設定 |找不到|請|今日配圖|AI 未選擇|尚無可重試|R2_PUBLIC_BASE_URL|配圖)/;
  return Response.json({ error: expected.test(text) ? text : "AI 配圖暫時無法完成，請檢查服務設定或稍後重試。" }, { status: 400 });
}
