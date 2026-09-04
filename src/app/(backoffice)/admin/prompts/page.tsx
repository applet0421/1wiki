import Link from "next/link";
import { redirect } from "next/navigation";
import { listPromptDefinitions } from "@/lib/ai/prompt-repository";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function PromptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const prompts = await listPromptDefinitions(prisma);

  return (
    <section className="admin-grid">
      <div className="section-heading">
        <p className="eyebrow">僅 OWNER</p>
        <h1>Prompt 管理</h1>
        <p className="muted">管理每個 LLM 功能目前套用的 Prompt 與版本歷史。</p>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead><tr><th>功能</th><th>識別碼</th><th>啟用版本</th><th>最後更新</th><th>操作</th></tr></thead>
          <tbody>{prompts.map((prompt) => (
            <tr key={prompt.id}>
              <td><strong>{prompt.name}</strong><small>{prompt.description}</small></td>
              <td><code>{prompt.key}</code></td>
              <td><span className="status status-published">v{prompt.activeVersionNumber}</span></td>
              <td>{prompt.updatedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td>
              <td><Link className="button button-quiet" href={`/admin/prompts/${prompt.key}`}>編輯</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
