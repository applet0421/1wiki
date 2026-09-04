import Link from "next/link";
import { redirect } from "next/navigation";
import { PromptEditor } from "@/components/admin/prompt-editor";
import { parsePromptKey } from "@/lib/ai/prompt-definitions";
import { getPromptDetail } from "@/lib/ai/prompt-repository";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { restorePromptAction, savePromptAction } from "./actions";

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PromptDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/admin");
  const { key: rawKey } = await params;
  let key;
  try {
    key = parsePromptKey(rawKey);
  } catch {
    redirect("/admin/prompts");
  }
  const query = await searchParams;
  const detail = await getPromptDetail(prisma, key);
  const saveAction = savePromptAction.bind(null, key);
  const restoreAction = restorePromptAction.bind(null, key);

  return (
    <section className="admin-grid">
      <div className="section-heading heading-row">
        <div>
          <p className="eyebrow">Prompt 管理 · v{detail.active.versionNumber}</p>
          <h1>{detail.active.name}</h1>
          <p className="muted">{detail.active.description}</p>
        </div>
        <Link className="button button-quiet" href="/admin/prompts">返回列表</Link>
      </div>
      {query.error ? <p className="form-error" role="alert">{query.error}</p> : null}
      {query.success ? <p className="form-success">{query.success === "restored" ? "已回復並建立新版本。" : "新版本已儲存並立即啟用。"}</p> : null}
      <PromptEditor
        active={{
          key,
          versionNumber: detail.active.versionNumber,
          systemTemplate: detail.active.systemTemplate,
          userTemplate: detail.active.userTemplate,
          allowedVariables: detail.active.allowedVariables,
          requiredVariables: detail.active.requiredVariables,
        }}
        versions={detail.versions.map((version) => ({
          versionNumber: version.versionNumber,
          createdAt: version.createdAt.toISOString(),
          createdByName: version.createdBy?.displayName ?? null,
        }))}
        saveAction={saveAction}
        restoreAction={restoreAction}
      />
    </section>
  );
}
