import { AIContentGenerator } from "@/components/admin/ai-content-generator";

export default function GeneratePostPage() {
  return <section>
    <p className="eyebrow">AI 內容工作台</p>
    <h1>AI 內容生成</h1>
    <p className="muted">先讓 AI 理解參考內容並提出文章機會，再選擇一個搜尋意圖建立草稿。</p>
    <AIContentGenerator provider={process.env.LLM_PROVIDER || "deepseek"} />
  </section>;
}
