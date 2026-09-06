import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getSearchEngineSummary } from "@/lib/search-engine/repository";
import { controlWorkerAction, retryWorkerJobAction } from "./actions";

const PAGE_SIZE = 20;
type SearchParams = { error?: string; success?: string; page?: string };

function pageHref(page: number) { return page > 1 ? `/admin/worker?page=${page}` : "/admin/worker"; }
function statusFor(lastHeartbeat: Date | undefined, healthyMs = 15000, staleMs = 120000) {
  if (!lastHeartbeat) return { label: "尚未啟動", className: "status-failure" };
  const age = Date.now() - lastHeartbeat.getTime();
  if (age < healthyMs) return { label: "執行中", className: "status-published" };
  if (age < staleMs) return { label: "心跳逾時", className: "status-draft" };
  return { label: "離線", className: "status-failure" };
}
function time(date: Date | undefined) { return date?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) || "—"; }

export default async function WorkerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const workerHeartbeat = (prisma as typeof prisma & { workerHeartbeat?: typeof prisma.workerHeartbeat }).workerHeartbeat;
  const [heartbeat, searchHeartbeat, grouped, totalJobs, recent, searchSummary] = await Promise.all([
    workerHeartbeat?.findUnique({ where: { id: "image-worker" } }) ?? Promise.resolve(null),
    workerHeartbeat?.findUnique({ where: { id: "search-engine-worker" } }) ?? Promise.resolve(null),
    prisma.imageGeneration.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.imageGeneration.count(),
    prisma.imageGeneration.findMany({ orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, status: true, model: true, imageSize: true, aspectRatio: true, error: true, updatedAt: true, imageBytes: true } }),
    getSearchEngineSummary(prisma),
  ]);
  const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
  const imageStatus = statusFor(heartbeat?.lastHeartbeat);
  const searchStatus = statusFor(searchHeartbeat?.lastHeartbeat, 10 * 60_000, 30 * 60_000);
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
  return <section className="admin-grid">
    <div className="section-heading"><p className="eyebrow">僅 OWNER</p><h1>Worker 監控</h1><p className="muted">查看背景程序健康狀態、佇列數量、錯誤與任務紀錄。</p></div>
    {params.error ? <p className="form-error" role="alert">{params.error}</p> : null}{params.success ? <p className="form-success" role="status">Worker 控制訊號已送出。</p> : null}
    <div className="panel"><div className="heading-row"><div><h2>AI 配圖 Worker</h2><p className="muted">外部程序依照控制訊號處理 AI 配圖佇列。</p><p className="muted">最近心跳：{time(heartbeat?.lastHeartbeat)} · 控制狀態：{heartbeat?.desiredState || "—"}</p></div><span className={`status ${imageStatus.className}`}>{imageStatus.label}</span></div><div className="worker-toolbar"><form method="get"><button className="button button-quiet" type="submit">重新整理</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="start" /><button className="button button-primary" type="submit">設定啟用</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="restart" /><button className="button button-quiet" type="submit">要求重啟</button></form><form action={controlWorkerAction}><input type="hidden" name="action" value="stop" /><button className="button button-quiet" type="submit">設定停用</button></form></div></div>
    <div className="metric-grid"><div className="metric-card"><span>配圖最近心跳</span><strong>{time(heartbeat?.lastHeartbeat)}</strong></div><div className="metric-card"><span>等待生成</span><strong>{counts.QUEUED || 0}</strong></div><div className="metric-card"><span>處理中</span><strong>{(counts.GENERATING || 0) + (counts.UPLOADING || 0)}</strong></div><div className="metric-card"><span>失敗</span><strong>{counts.FAILED || 0}</strong></div></div>
    {heartbeat?.lastError ? <p className="form-error" role="alert">配圖 Worker 最近錯誤：{heartbeat.lastError}</p> : null}
    <div className="panel"><div className="heading-row"><div><h2>搜尋引擎通知 Worker</h2><p className="muted">由 Cron 定期執行 Bing IndexNow 與 Google sitemap 提交。</p><p className="muted">最後心跳：{time(searchHeartbeat?.lastHeartbeat)} · 已處理：{searchHeartbeat?.processed || 0}</p></div><span className={`status ${searchStatus.className}`}>{searchStatus.label}</span></div><div className="metric-grid"><div className="metric-card"><span>Bing 待處理</span><strong>{searchSummary.pending}</strong></div><div className="metric-card"><span>Bing 失敗</span><strong>{searchSummary.failed}</strong></div><div className="metric-card"><span>GSC 待處理</span><strong>{searchSummary.google.pending}</strong></div><div className="metric-card"><span>GSC 失敗</span><strong>{searchSummary.google.failed}</strong></div></div>{searchHeartbeat?.lastError ? <p className="form-error" role="alert">搜尋引擎 Worker 最近錯誤：{searchHeartbeat.lastError}</p> : null}</div>
    <div className="panel table-wrap"><div className="heading-row"><div><h2>AI 配圖任務紀錄</h2><p className="muted">依更新時間排序，每頁 {PAGE_SIZE} 筆。</p></div><span className="muted">共 {totalJobs} 筆</span></div><table><thead><tr><th>更新時間</th><th>狀態</th><th>模型</th><th>尺寸／比例</th><th>操作</th></tr></thead><tbody>{recent.map((job) => <tr key={job.id}><td>{time(job.updatedAt)}</td><td>{job.status}</td><td>{job.model}</td><td>{job.imageSize} · {job.aspectRatio}</td><td>{job.status === "FAILED" && job.imageBytes ? <form action={retryWorkerJobAction}><input type="hidden" name="id" value={job.id} /><button className="button button-quiet" type="submit">重試上傳</button></form> : job.error ? <small>{job.error}</small> : "—"}</td></tr>)}{recent.length === 0 ? <tr><td colSpan={5}>尚無任務紀錄。</td></tr> : null}</tbody></table><div className="pagination">{page > 1 ? <Link className="button button-quiet" href={pageHref(page - 1)}>上一頁</Link> : <span /> }<span>第 {page} 頁，共 {totalPages} 頁</span>{page < totalPages ? <Link className="button button-quiet" href={pageHref(page + 1)}>下一頁</Link> : <span />}</div></div>
  </section>;
}
