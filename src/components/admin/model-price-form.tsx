import { createModelPriceAction } from "@/app/(backoffice)/admin/llm-usage/actions";

type PriceRow = {
  id: string;
  provider: string;
  model: string;
  inputRate: string;
  outputRate: string;
  effectiveAt: string;
};

function localDateTimeValue() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

export function ModelPriceForm({ prices }: { prices: PriceRow[] }) {
  return (
    <section className="panel admin-grid">
      <div>
        <h2>模型費率</h2>
        <p className="muted">單位為每百萬 Token 的美元。新增費率只影響生效時間之後的呼叫，歷史成本不重算。</p>
      </div>
      <form action={createModelPriceAction} className="form-grid">
        <label>供應商<select name="provider" defaultValue="openai"><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="deepseek">DeepSeek</option></select></label>
        <label>模型名稱<input name="model" required maxLength={120} placeholder="gpt-5" /></label>
        <label>輸入費率（USD / 1M Token）<input name="inputRate" type="number" required min="0.00000001" step="0.00000001" /></label>
        <label>輸出費率（USD / 1M Token）<input name="outputRate" type="number" required min="0.00000001" step="0.00000001" /></label>
        <label>生效時間<input name="effectiveAt" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
        <div className="editor-actions"><button className="button button-primary" type="submit">新增費率</button></div>
      </form>
      {prices.length ? <div className="table-wrap"><table><thead><tr><th>供應商 / 模型</th><th>輸入費率</th><th>輸出費率</th><th>生效時間</th></tr></thead><tbody>{prices.map((price) => <tr key={price.id}><td><strong>{price.provider}</strong><small>{price.model}</small></td><td>${price.inputRate}</td><td>${price.outputRate}</td><td>{new Date(price.effectiveAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>)}</tbody></table></div> : <p className="muted">尚未設定模型費率；LLM 呼叫仍可執行，但成本會顯示為無法估算。</p>}
    </section>
  );
}
