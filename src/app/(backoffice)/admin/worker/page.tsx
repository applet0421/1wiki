import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { controlWorkerAction, retryWorkerJobAction } from "./actions";

const WORKER_ID = "image-worker";

function statusFor(lastHeartbeat: Date | undefined) {
  if (!lastHeartbeat) return { label: "尚未啟動", className: "status-failure" };
  const age = Date.now() - lastHeartbeat.getTime();
  if (age < 15000) return { label: "執行中", className: "status-published" };
  if (age < 120000) return { label: "心跳逾時", className: "status-draft" };
  return { label: "離線", className: "status-failure" };
}

export default async function WorkerPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const workerHeartbeat = (prisma as typeof prisma & { workerHeartbeat?: typeof prisma.workerHeartbeat }).workerHeartbeat;
  const [heartbeat, grouped, recent] = await Promise.all([
    workerHeartbeat?.findUnique({ where: { id: WORKER_ID } }) ?? Promise.resolve(null),
    prisma.imageGeneration.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.imageGeneration.findMany({ orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, status: true, model: true, imageSize: true, aspectRatio: true, error: true, updatedAt: true, imageBytes: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
  const workerStatus = statusFor(heartbeat?.lastHeartbeat);
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">僅 OWNER</p><h1>Worker 監控</h1><p className="muted">監控 AI 配圖 worker 心跳、佇列與最近任務。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success" role="status">Worker 操作已送出。</p> : null}
    <div className="worker-toolbar"><form method="get"><button className="button button-quiet" type="submit">重新整理</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="start" /><button className="button button-primary" type="submit">啟動 Worker</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="restart" /><button className="button button-quiet" type="submit">重啟 Worker</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="stop" /><button className="button button-quiet" type="submit">停止 Worker</button></form><span className={`status ${workerStatus.className}`}>{workerStatus.label}</span></div>
    <div className="metric-grid">
      <div className="metric-card"><span>最近心跳</span><strong>{heartbeat ? heartbeat.lastHeartbeat.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "—"}</strong></div>
      <div className="metric-card"><span>等待生成</span><strong>{counts.QUEUED || 0}</strong></div>
      <div className="metric-card"><span>處理中</span><strong>{(counts.GENERATING || 0) + (counts.UPLOADING || 0)}</strong></div>
      <div className="metric-card"><span>失敗</span><strong>{counts.FAILED || 0}</strong></div>
    </div>
    {heartbeat?.lastError ? <p className="form-error" role="alert">最近錯誤：{heartbeat.lastError}</p> : null}
    <div className="panel table-wrap"><table><thead><tr><th>更新時間</th><th>狀態</th><th>模型</th><th>尺寸／比例</th><th>操作</th></tr></thead><tbody>{recent.map((job) => <tr key={job.id}><td>{job.updatedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td><td>{job.status}</td><td>{job.model}</td><td>{job.imageSize} · {job.aspectRatio}</td><td>{job.status === "FAILED" && job.imageBytes ? <form action={retryWorkerJobAction}><input type="hidden" name="id" value={job.id} /><button className="button button-quiet" type="submit">重試上傳</button></form> : job.error ? <small>{job.error}</small> : "—"}</td></tr>)}</tbody></table></div>
  </section>;
}
