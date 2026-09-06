import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor media controls", () => {
  it("opens an inline URL field instead of using a browser prompt", () => {
    render(<RichTextEditor />);

    fireEvent.click(screen.getByRole("button", { name: "連結" }));

    expect(screen.getByLabelText("連結網址")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入連結" })).toBeInTheDocument();
  });

  it("inserts a URL image into the editor and keeps it in view", () => {
    const { container } = render(<RichTextEditor />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement;
    editor.focus();
    fireEvent.click(screen.getByRole("button", { name: "圖片網址" }));
    fireEvent.change(screen.getByLabelText("圖片網址"), { target: { value: "https://media.example.com/image.png" } });
    fireEvent.click(screen.getByRole("button", { name: "插入圖片" }));
    expect(container.querySelector('[contenteditable="true"] img')).toHaveAttribute("src", "https://media.example.com/image.png");
  });

  it("inserts a URL image at the saved cursor position after the editor loses focus", () => {
    const { container } = render(<RichTextEditor initialHtml="<p>前後</p>" />);
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement;
    const text = editor.querySelector("p")?.firstChild as Text;
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(text, 1);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.blur(editor);
    selection?.removeAllRanges();
    fireEvent.click(screen.getByRole("button", { name: "圖片網址" }));
    fireEvent.change(screen.getByLabelText("圖片網址"), { target: { value: "https://media.example.com/image.png" } });
    fireEvent.click(screen.getByRole("button", { name: "插入圖片" }));

    expect(editor.querySelector("p img")).toHaveAttribute("src", "https://media.example.com/image.png");
    expect(editor.querySelector("p")?.textContent).toBe("前後");
  });

  it("does not nest the inline URL controls inside the article form", () => {
    const { container } = render(<form><RichTextEditor /></form>);

    fireEvent.click(screen.getByRole("button", { name: "連結" }));

    expect(container.querySelectorAll("form")).toHaveLength(1);
  });

  it("offers an image upload control that accepts supported image files", () => {
    render(<RichTextEditor />);

    expect(screen.getByRole("button", { name: "上傳圖片" })).toBeInTheDocument();
    const input = screen.getByLabelText("選擇要上傳的圖片") as HTMLInputElement;
    expect(input.accept).toBe("image/jpeg,image/png,image/webp,image/gif");
  });

  it("uploads a selected image and inserts the returned public URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ uploadUrl: "https://upload.example.com/signed", publicUrl: "https://media.example.com/uploads/image.png" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<RichTextEditor />);

    const input = screen.getByLabelText("選擇要上傳的圖片");
    fireEvent.change(input, { target: { files: [new File(["image"], "image.png", { type: "image/png" })] } });

    expect(await screen.findByText("圖片已上傳，請設定替代文字後插入正文")).toBeInTheDocument();
    const altInput = screen.getByLabelText("圖片替代文字");
    expect(altInput).toHaveValue("image");
    fireEvent.change(altInput, { target: { value: "文章主題示意圖" } });
    fireEvent.click(screen.getByRole("button", { name: "插入圖片" }));
    expect(await screen.findByText("圖片已插入正文")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/uploads/images", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://upload.example.com/signed", expect.objectContaining({ method: "PUT" }));
    const insertedImage = container.querySelector('[contenteditable="true"] img');
    expect(insertedImage).toHaveAttribute("src", "https://media.example.com/uploads/image.png");
    expect(insertedImage).toHaveAttribute("alt", "文章主題示意圖");
  });

  it("shows and updates alt text when an article image is selected", () => {
    const { container } = render(<RichTextEditor initialHtml='<p>段落</p><img src="https://media.example.com/image.png" alt="原本的替代文字">' />);
    const image = container.querySelector("[contenteditable=\"true\"] img") as HTMLImageElement;

    fireEvent.click(image);

    expect(screen.getByRole("group", { name: "編輯圖片" })).toBeInTheDocument();
    const altInput = screen.getByLabelText("圖片替代文字");
    expect(altInput).toHaveValue("原本的替代文字");
    fireEvent.change(altInput, { target: { value: "更新後的替代文字" } });
    fireEvent.click(screen.getByRole("button", { name: "更新圖片" }));

    expect(image).toHaveAttribute("alt", "更新後的替代文字");
  });
});
