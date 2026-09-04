export type PromptTemplateInput = {
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: readonly string[];
  requiredVariables: readonly string[];
};

const VALID_MARKER = /{{([A-Za-z][A-Za-z0-9]*)}}/g;

function markerNames(template: string): string[] {
  return [...template.matchAll(VALID_MARKER)].map((match) => match[1]);
}

export function validatePromptTemplate(input: PromptTemplateInput): void {
  if (!input.userTemplate.trim()) throw new Error("User Prompt 不可為空");

  const combined = `${input.systemTemplate}\n${input.userTemplate}`;
  const remainder = combined.replace(VALID_MARKER, "");
  if (remainder.includes("{{") || remainder.includes("}}")) {
    throw new Error("Prompt 變數格式不正確");
  }

  const names = new Set(markerNames(combined));
  const unknown = [...names].find((name) => !input.allowedVariables.includes(name));
  if (unknown) throw new Error(`未知變數：${unknown}`);

  const missing = input.requiredVariables.find((name) => !names.has(name));
  if (missing) throw new Error(`缺少必要變數：${missing}`);
}

export function renderPromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(VALID_MARKER, (_marker, name: string) => {
    if (!Object.hasOwn(variables, name)) throw new Error(`缺少 Prompt 變數：${name}`);
    return variables[name];
  });
}
