import type { GenerateArticleInput } from "./types";

export function buildArticlePrompt(input: GenerateArticleInput): string {
  return `請撰寫一篇繁體中文科技問題解答文章。
主題：${input.topic.trim()}
主要關鍵字：${input.keyword.trim()}
補充要求：${input.instructions?.trim() || "以清楚、可驗證、可操作的步驟回答"}

正文使用 p、h2、h3、strong、em、ul、ol、li、blockquote、code、pre、br、a 等安全 HTML。
不得加入 script、style、iframe、ins、廣告碼或 Markdown code fence。
不得捏造個人實測經驗；不確定的資訊應明確提醒讀者核對官方設定。`;
}
