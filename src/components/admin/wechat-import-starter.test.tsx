import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeChatImportStarter } from "./wechat-import-starter";
import * as actions from "@/app/(backoffice)/admin/posts/wechat-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(backoffice)/admin/posts/wechat-actions", () => ({ createWeChatImportAction: vi.fn(), resetAllWeChatImportsAction: vi.fn() }));

describe("WeChat import starter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires confirmation before clearing all unfinished WeChat staging work", () => {
    render(<WeChatImportStarter />);

    fireEvent.click(screen.getByRole("button", { name: "重置所有微信暫存" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("確定重置所有微信暫存工作？")).toBeInTheDocument();
    expect(actions.resetAllWeChatImportsAction).not.toHaveBeenCalled();
  });
});
