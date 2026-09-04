import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptEditor } from "./prompt-editor";

describe("PromptEditor", () => {
  it("previews variables without changing the template and lists immutable history", () => {
    render(<PromptEditor
      active={{
        key: "ARTICLE_GENERATE",
        versionNumber: 2,
        systemTemplate: "系統：{{languageInstruction}}",
        userTemplate: "主題：{{topic}}",
        allowedVariables: ["languageInstruction", "topic"],
        requiredVariables: ["languageInstruction", "topic"],
      }}
      versions={[{ versionNumber: 1, createdAt: "2026-09-04T10:00:00.000Z", createdByName: null }]}
      saveAction={vi.fn()}
      restoreAction={vi.fn()}
    />);

    fireEvent.change(screen.getByLabelText("User Prompt"), { target: { value: "文章：{{topic}}" } });
    fireEvent.click(screen.getByRole("button", { name: "預覽代入" }));
    expect(screen.getByText("文章：［topic 範例］")).toBeInTheDocument();
    expect(screen.getByLabelText("User Prompt")).toHaveValue("文章：{{topic}}");
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText(/系統建立/).textContent).toBe("系統建立 · 2026/9/4 下午6:00:00");
    expect(screen.getByRole("button", { name: "回復此版本" })).toBeInTheDocument();
  });
});
