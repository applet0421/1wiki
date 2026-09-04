import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { executeLLMCall } from "./execute-llm";
import { parseArticleJson } from "./errors";
import { articlePromptVariables } from "./prompt";
import { articleJsonSchema } from "./schema";
import type { GenerateArticleInput, GeneratedArticle } from "./types";

type Options = { env?: Record<string, string | undefined>; fetcher?: typeof fetch; execute?: typeof executeLLMCall };
export async function generateArticle(input: GenerateArticleInput, options: Options = {}): Promise<GeneratedArticle> {
  const execute = options.execute ?? executeLLMCall;
  const generated = await execute({
    key: "ARTICLE_GENERATE",
    variables: articlePromptVariables(input),
    jsonSchema: articleJsonSchema,
    schemaName: "article",
    parse: parseArticleJson,
  }, { env: options.env, fetcher: options.fetcher });
  return { ...generated, contentHtml: sanitizeArticleHtml(generated.contentHtml) };
}
