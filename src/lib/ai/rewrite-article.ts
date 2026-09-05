import sanitizeHtml from "sanitize-html";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { executeLLMCall, type LLMExecutor } from "./execute-llm";
import { parseArticleJson } from "./errors";
import { rewritePromptVariables } from "./prompt";
import { articleJsonSchema } from "./schema";
import type { GeneratedArticle, RewriteArticleInput } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch; execute?: LLMExecutor };

function normalizeSource(input: RewriteArticleInput): RewriteArticleInput {
  const sourceTitle = input.sourceTitle.trim();
  const sourceContentHtml = sanitizeArticleHtml(input.sourceContentHtml);
  const sourceText = sanitizeHtml(sourceContentHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\u00a0/g, " ")
    .trim();

  if (!sourceTitle || !sourceText) throw new Error("請填寫原文章標題與內容。");
  if (sourceTitle.length > 180) throw new Error("原文章標題不可超過 180 字。");
  if (sourceContentHtml.length > 100_000) throw new Error("原文章內容過長，請縮短至 100,000 字元以內。");

  return { ...input, sourceTitle, sourceContentHtml };
}

export async function rewriteArticle(input: RewriteArticleInput, options: Options = {}): Promise<GeneratedArticle> {
  const source = normalizeSource(input);
  const execute = options.execute ?? executeLLMCall;
  const rewritten = await execute({
    key: "ARTICLE_REWRITE",
    variables: rewritePromptVariables(source),
    jsonSchema: articleJsonSchema,
    schemaName: "article",
    maxTokens: 4200,
    parse: parseArticleJson,
  }, { env: options.env, fetcher: options.fetcher }) as GeneratedArticle;

  return { ...rewritten, contentHtml: sanitizeArticleHtml(rewritten.contentHtml) };
}
