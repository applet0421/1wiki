import { describe, expect, it } from "vitest";
import { renderPromptTemplate, validatePromptTemplate } from "./prompt-template";

describe("Prompt templates", () => {
  it("replaces declared variables exactly once", () => {
    expect(renderPromptTemplate("主題：{{topic}}", { topic: "保留 {{keyword}}" }))
      .toBe("主題：保留 {{keyword}}");
  });

  it("rejects unknown variables", () => {
    expect(() => validatePromptTemplate({
      systemTemplate: "",
      userTemplate: "{{unknown}}",
      allowedVariables: ["topic"],
      requiredVariables: [],
    })).toThrow("未知變數：unknown");
  });

  it("rejects missing required variables", () => {
    expect(() => validatePromptTemplate({
      systemTemplate: "系統",
      userTemplate: "文章",
      allowedVariables: ["topic"],
      requiredVariables: ["topic"],
    })).toThrow("缺少必要變數：topic");
  });

  it.each(["{{}}", "{{ topic }}", "{{topic"])("rejects malformed marker %s", (userTemplate) => {
    expect(() => validatePromptTemplate({
      systemTemplate: "",
      userTemplate,
      allowedVariables: ["topic"],
      requiredVariables: [],
    })).toThrow("Prompt 變數格式不正確");
  });

  it("requires a non-empty user template", () => {
    expect(() => validatePromptTemplate({
      systemTemplate: "系統",
      userTemplate: " ",
      allowedVariables: [],
      requiredVariables: [],
    })).toThrow("User Prompt 不可為空");
  });
});
