import { prisma } from "@/lib/db/prisma";
import { imageJobViewSelect, queueArticleImage } from "@/lib/ai/image-jobs";
import { imageJobActionSchema } from "@/lib/ai/image-jobs-schema";
import { imageApiUser, imageApiError, readImageJson } from "@/lib/ai/image-api";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const user = await imageApiUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const job = await prisma.imageGeneration.findFirst({ where: { id, userId: user.id }, select: imageJobViewSelect });
  return job ? Response.json({ ...job, canRetryUpload: job.status === "FAILED" && !!job.mimeType }) : Response.json({ error: "找不到配圖任務" }, { status: 404 });
}
export async function POST(request: Request, { params }: Context) {
  const user = await imageApiUser(request);
  if (user instanceof Response) return user;
  try {
    const { id } = await params;
    const job = await queueArticleImage(prisma, user.id, id, imageJobActionSchema.parse(await readImageJson(request)));
    return Response.json({ ...job, canRetryUpload: job.status === "FAILED" && !!job.mimeType });
  } catch (error) { return imageApiError(error); }
}
