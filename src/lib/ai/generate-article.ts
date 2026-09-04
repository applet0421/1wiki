import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { executeLLMCall, type LLMExecutor } from "./execute-llm";
import { parseArticleJson } from "./errors";
import { articlePromptVariables } from "./prompt";
import { articleJsonSchema } from "./schema";
import type { GenerateArticleInput, GeneratedArticle } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch; execute?: LLMExecutor };
export async function generateArticle(input: GenerateArticleInput, options: Options = {}): Promise<GeneratedArticle> {
  const execute = options.execute ?? executeLLMCall;
  const generated = await execute({
    key: "ARTICLE_GENERATE",
    variables: articlePromptVariables(input),
    jsonSchema: articleJsonSchema,
    schemaName: "article",
    maxTokens: 4200,
    parse: parseArticleJson,
  }, { env: options.env, fetcher: options.fetcher }) as GeneratedArticle;
  return { ...generated, contentHtml: sanitizeArticleHtml(generated.contentHtml) };
}
