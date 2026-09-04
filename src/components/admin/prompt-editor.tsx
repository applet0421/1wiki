"use client";

import { useState } from "react";
import { renderPromptTemplate } from "@/lib/ai/prompt-template";
import type { PromptKey } from "@/lib/ai/prompt-definitions";

type EditorPrompt = {
  key: PromptKey;
  versionNumber: number;
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
};

type VersionSummary = {
  versionNumber: number;
  createdAt: string;
  createdByName: string | null;
};

type Props = {
  active: EditorPrompt;
  versions: VersionSummary[];
  saveAction: (formData: FormData) => void | Promise<void>;
  restoreAction: (formData: FormData) => void | Promise<void>;
};

export function PromptEditor({ active, versions, saveAction, restoreAction }: Props) {
  const [systemTemplate, setSystemTemplate] = useState(active.systemTemplate);
  const [userTemplate, setUserTemplate] = useState(active.userTemplate);
  const [preview, setPreview] = useState<{ system: string; user: string } | null>(null);

  function previewTemplates() {
    const variables = Object.fromEntries(active.allowedVariables.map((name) => [name, `［${name} 範例］`]));
    setPreview({
      system: renderPromptTemplate(systemTemplate, variables),
      user: renderPromptTemplate(userTemplate, variables),
    });
  }

  return (
    <div className="admin-grid">
      <form action={saveAction} className="panel prompt-editor">
        <input type="hidden" name="baseVersionNumber" value={active.versionNumber} />
        <div className="variable-list" aria-label="Prompt 變數">
          {active.allowedVariables.map((name) => (
            <code key={name}>{`{{${name}}}`}{active.requiredVariables.includes(name) ? " *" : ""}</code>
          ))}
        </div>
        <label>System Prompt
          <textarea name="systemTemplate" rows={8} value={systemTemplate} onChange={(event) => setSystemTemplate(event.target.value)} />
        </label>
        <label>User Prompt
          <textarea name="userTemplate" rows={22} required value={userTemplate} onChange={(event) => setUserTemplate(event.target.value)} />
        </label>
        <div className="row-actions">
          <button type="button" className="button button-quiet" onClick={previewTemplates}>預覽代入</button>
          <button type="submit" className="button button-primary">儲存為新版本並啟用</button>
        </div>
      </form>

      {preview ? (
        <section className="panel prompt-preview" aria-label="Prompt 預覽">
          <h2>代入預覽</h2>
          <h3>System</h3><pre>{preview.system || "（空白）"}</pre>
          <h3>User</h3><pre>{preview.user}</pre>
        </section>
      ) : null}

      <section className="panel version-list">
        <h2>版本歷史</h2>
        {versions.map((version) => (
          <div className="version-row" key={version.versionNumber}>
            <div>
              <strong>v{version.versionNumber}</strong>
              <small>{version.createdByName || "系統建立"} · {new Date(version.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }).replace(/\s+/gu, " ")}</small>
            </div>
            {version.versionNumber === active.versionNumber ? <span className="status status-published">目前啟用</span> : (
              <form action={restoreAction}>
                <input type="hidden" name="baseVersionNumber" value={active.versionNumber} />
                <input type="hidden" name="sourceVersionNumber" value={version.versionNumber} />
                <button type="submit" className="button button-quiet">回復此版本</button>
              </form>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
