export const promptKeys = [
  "ARTICLE_GENERATE",
  "ARTICLE_REWRITE",
  "SOURCE_ANALYZE",
  "IDEA_GENERATE",
] as const;

export type PromptKey = (typeof promptKeys)[number];

export type PromptMetadata = {
  name: string;
  allowedVariables: readonly string[];
  requiredVariables: readonly string[];
};

export const promptMetadata: Record<PromptKey, PromptMetadata> = {
  ARTICLE_GENERATE: {
    name: "一般文章生成",
    allowedVariables: ["languageInstruction", "topic", "keyword", "instructions"],
    requiredVariables: ["languageInstruction", "topic", "keyword", "instructions"],
  },
  ARTICLE_REWRITE: {
    name: "文章改寫",
    allowedVariables: ["languageInstruction", "sourceTitle", "sourceContentHtml"],
    requiredVariables: ["languageInstruction", "sourceTitle", "sourceContentHtml"],
  },
  SOURCE_ANALYZE: {
    name: "來源內容分析",
    allowedVariables: ["languageInstruction", "sourceContent"],
    requiredVariables: ["languageInstruction", "sourceContent"],
  },
  IDEA_GENERATE: {
    name: "依主題生成文章",
    allowedVariables: ["languageInstruction", "contentType", "title", "primaryKeyword", "searchIntent", "support", "structure", "categories", "sourceContent"],
    requiredVariables: ["languageInstruction", "contentType", "title", "primaryKeyword", "searchIntent", "support", "structure", "categories", "sourceContent"],
  },
};

export function parsePromptKey(value: string): PromptKey {
  if (!promptKeys.includes(value as PromptKey)) throw new Error("找不到 Prompt。");
  return value as PromptKey;
}
