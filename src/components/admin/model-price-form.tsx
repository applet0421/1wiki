"use client";

import { Fragment, useState } from "react";
import {
  createModelPriceAction,
  deleteModelPriceAction,
  updateModelPriceAction,
} from "@/app/(backoffice)/admin/llm-usage/actions";

type PriceRow = {
  id: string;
  provider: string;
  model: string;
  inputRate: string;
  outputRate: string;
  effectiveAt: string;
};

function localDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function ProviderOptions() {
  return <><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="deepseek">DeepSeek</option></>;
}

export function ModelPriceForm({ prices }: { prices: PriceRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="panel admin-grid">
      <div>
        <h2>模型費率</h2>
        <p className="muted">單位為每百萬 Token 的美元。新增、修改或刪除費率只影響後續呼叫，歷史成本不重算。</p>
      </div>
      <form action={createModelPriceAction} className="form-grid">
        <label>供應商<select name="provider" defaultValue="openai"><ProviderOptions /></select></label>
        <label>模型名稱<input name="model" required maxLength={120} placeholder="gpt-5" /></label>
        <label>輸入費率（USD / 1M Token）<input name="inputRate" type="number" required min="0.00000001" step="0.00000001" /></label>
        <label>輸出費率（USD / 1M Token）<input name="outputRate" type="number" required min="0.00000001" step="0.00000001" /></label>
        <label>生效時間<input name="effectiveAt" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
        <div className="editor-actions"><button className="button button-primary" type="submit">新增費率</button></div>
      </form>
      {prices.length ? <div className="table-wrap"><table>
        <thead><tr><th>供應商 / 模型</th><th>輸入費率</th><th>輸出費率</th><th>生效時間</th><th>操作</th></tr></thead>
        <tbody>{prices.map((price) => <Fragment key={price.id}>
          <tr>
            <td><strong>{price.provider}</strong><small>{price.model}</small></td>
            <td>${price.inputRate}</td>
            <td>${price.outputRate}</td>
            <td>{new Date(price.effectiveAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td>
            <td><div className="row-actions">
              <button className="button button-quiet" type="button" aria-label={`編輯 ${price.model}`} onClick={() => setEditingId(editingId === price.id ? null : price.id)}>編輯</button>
              <form
                action={deleteModelPriceAction}
                onSubmit={(event) => {
                  if (!window.confirm(`確定刪除 ${price.provider} / ${price.model} 的費率？歷史成本不會重算。`)) event.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={price.id} />
                <button className="button button-danger" type="submit" aria-label={`刪除 ${price.model}`}>刪除</button>
              </form>
            </div></td>
          </tr>
          {editingId === price.id ? <tr><td colSpan={5}>
            <form action={updateModelPriceAction} className="form-grid">
              <input type="hidden" name="id" value={price.id} />
              <label>編輯供應商<select name="provider" defaultValue={price.provider}><ProviderOptions /></select></label>
              <label>編輯模型名稱<input name="model" required maxLength={120} defaultValue={price.model} /></label>
              <label>編輯輸入費率（USD / 1M Token）<input name="inputRate" type="number" required min="0.00000001" step="0.00000001" defaultValue={price.inputRate} /></label>
              <label>編輯輸出費率（USD / 1M Token）<input name="outputRate" type="number" required min="0.00000001" step="0.00000001" defaultValue={price.outputRate} /></label>
              <label>編輯生效時間<input name="effectiveAt" type="datetime-local" required defaultValue={localDateTimeValue(price.effectiveAt)} /></label>
              <div className="editor-actions">
                <button className="button button-primary" type="submit">儲存修改</button>
                <button className="button button-quiet" type="button" onClick={() => setEditingId(null)}>取消</button>
              </div>
            </form>
          </td></tr> : null}
        </Fragment>)}</tbody>
      </table></div> : <p className="muted">尚未設定模型費率；LLM 呼叫仍可執行，但成本會顯示為無法估算。</p>}
    </section>
  );
}
