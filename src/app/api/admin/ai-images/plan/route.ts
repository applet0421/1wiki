import { prisma } from "@/lib/db/prisma";
import { planArticleImage } from "@/lib/ai/image-jobs";
import { imageApiUser, imageApiError, readImageJson } from "@/lib/ai/image-api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await imageApiUser(request);
  if (user instanceof Response) return user;
  try { return Response.json(await planArticleImage(prisma, user.id, await readImageJson(request))); }
  catch (error) { return imageApiError(error); }
}
