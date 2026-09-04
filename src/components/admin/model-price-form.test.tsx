import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModelPriceForm } from "./model-price-form";

const { deleteModelPriceAction } = vi.hoisted(() => ({
  deleteModelPriceAction: vi.fn(),
}));

vi.mock("@/app/(backoffice)/admin/llm-usage/actions", () => ({
  createModelPriceAction: vi.fn(),
  updateModelPriceAction: vi.fn(),
  deleteModelPriceAction,
}));

const price = {
  id: "price-1",
  provider: "deepseek",
  model: "deepseek-v4-flash",
  inputRate: "0.22",
  outputRate: "0.66",
  effectiveAt: "2026-09-04T12:00:00.000Z",
};

describe("ModelPriceForm", () => {
  it("opens a prefilled editor for an existing rate", () => {
    render(<ModelPriceForm prices={[price]} />);

    fireEvent.click(screen.getByRole("button", { name: "編輯 deepseek-v4-flash" }));

    expect(screen.getByLabelText("編輯供應商")).toHaveValue("deepseek");
    expect(screen.getByLabelText("編輯模型名稱")).toHaveValue("deepseek-v4-flash");
    expect(screen.getByLabelText("編輯輸入費率（USD / 1M Token）")).toHaveValue(0.22);
    expect(screen.getByLabelText("編輯輸出費率（USD / 1M Token）")).toHaveValue(0.66);
    expect(screen.getByRole("button", { name: "儲存修改" })).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a rate", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ModelPriceForm prices={[price]} />);

    const deleteButton = screen.getByRole("button", { name: "刪除 deepseek-v4-flash" });
    fireEvent.submit(deleteButton.closest("form")!);

    expect(confirm).toHaveBeenCalledWith("確定刪除 deepseek / deepseek-v4-flash 的費率？歷史成本不會重算。");
    expect(deleteModelPriceAction).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
