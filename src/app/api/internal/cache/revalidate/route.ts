import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.CACHE_REVALIDATE_SECRET || process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "未授權" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths) && body.paths.every((path) => typeof path === "string")
    ? [...new Set(body.paths)]
    : null;
  if (!paths || paths.length === 0 || paths.length > 100) {
    return Response.json({ error: "無效的失效路徑" }, { status: 400 });
  }

  for (const path of paths) revalidatePath(path);
  return Response.json({ summary: paths.length, success: paths.length, failure: 0 });
}
