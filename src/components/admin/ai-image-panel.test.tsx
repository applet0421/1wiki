import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./rich-text-editor";
import { captureImageParagraphs, insertGeneratedImage } from "./image-paragraphs";

const planned = { id: "job1", status: "PLANNED", prompt: "Editorial concept", alt: "Concept illustration", reason: "Supports the explanation", targetId: "", paragraphs: [], publicUrl: null, width: null, height: null, error: null, model: "test", imageSize: "512", aspectRatio: "9:16", altWarning: null };
function fixture() { return render(<form><input name="title" defaultValue="Original title" /><RichTextEditor initialHtml="<h2>Heading</h2><p>Original paragraph</p>" aiImageContext={{ postId: "p1", locale: "zh-TW" }} /></form>); }
beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

afterEach(() => { vi.useRealTimers(); });

describe("AI image editor", () => {
  it("automatically analyzes, generates, polls, and inserts after the first image target", async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      const body = options?.body ? JSON.parse(options.body as string) : {};
      if (body.paragraphs) return new Response(JSON.stringify({ ...planned, paragraphs: body.paragraphs, targetId: body.paragraphs[1].id }));
      if (body.action === "generate") return new Response(JSON.stringify({ ...planned, status: "QUEUED", paragraphs: [{ id: body.targetId, tag: "p", text: "Original paragraph" }], targetId: body.targetId }));
      return new Response(JSON.stringify({ ...planned, status: "READY", publicUrl: "https://media.example.com/auto.webp", width: 512, height: 912, targetId: body.targetId }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = fixture();
    fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    fireEvent.click(screen.getByRole("button", { name: "自動執行並插入" }));
    await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://media.example.com/auto.webp"), { timeout: 5000 });
    const editor = container.querySelector('[contenteditable="true"]')!;
    expect(editor.querySelector("img")?.getAttribute("src")).toBe("https://media.example.com/auto.webp");
    expect(editor.querySelector("p + img")).not.toBeNull();
    expect(screen.getByRole("button", { name: "已插入正文" })).toBeInTheDocument();
  });

  it("analyzes latest unsaved title/body including headings, and blocks duplicate requests", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {})); vi.stubGlobal("fetch", fetchMock);
    const { container } = fixture();
    fireEvent.change(container.querySelector('[name="title"]')!, { target: { value: "Latest title" } });
    const editor = container.querySelector('[contenteditable="true"]')!; editor.querySelector("p")!.textContent = "Latest paragraph";
    fireEvent.input(editor); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    const analyze = screen.getByRole("button", { name: "分析標題與正文" }); fireEvent.click(analyze); fireEvent.click(analyze);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.title).toBe("Latest title"); expect(body.paragraphs.map((p: {text: string}) => p.text)).toEqual(["Heading", "Latest paragraph"]);
  });
  it("keeps a generated image when its target changes and inserts only after explicit reselection", async () => {
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      const body = JSON.parse(options?.body as string);
      return new Response(JSON.stringify(body.paragraphs ? { ...planned, paragraphs: body.paragraphs, targetId: body.paragraphs[1].id } : { ...planned, status: "READY", publicUrl: "https://media.example.com/a.webp", width: 384, height: 688 }));
    }); vi.stubGlobal("fetch", fetchMock);
    const { container } = fixture();
    fireEvent.click(screen.getByRole("button", { name: "AI 配圖" })); fireEvent.click(screen.getByRole("button", { name: "分析標題與正文" }));
    fireEvent.click(await screen.findByRole("button", { name: "生成圖片" }));
    const insert = await screen.findByRole("button", { name: "插入正文" });
    const editor = container.querySelector('[contenteditable="true"]')!;
    editor.querySelector("p")!.textContent = "Edited while generating"; fireEvent.input(editor);
    fireEvent.click(insert); expect(editor.querySelector("img")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("原段落已變更或刪除");
    const select = screen.getByLabelText("插入位置") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: select.options[1].value } }); fireEvent.click(insert);
    await waitFor(() => expect(editor.querySelector("img")).not.toBeNull());
    expect(editor.querySelector("img")?.previousElementSibling?.textContent).toBe("Edited while generating");
    expect(editor.querySelector("img")?.getAttribute("width")).toBe("384");
    expect((container.querySelector('[name="contentHtml"]') as HTMLInputElement).value).toContain('alt="Concept illustration"');
    fireEvent.click(screen.getByRole("button", { name: "已插入正文" })); expect(editor.querySelectorAll("img")).toHaveLength(1);
  });
  it("recovers a ready job but requires a fresh paragraph selection", async () => {
    sessionStorage.setItem("ai-image:p1", "job1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...planned, status: "READY", publicUrl: "https://media.example.com/a.webp" }))));
    fixture(); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    const insert = await screen.findByRole("button", { name: "插入正文" });
    expect(insert).toBeDisabled();
    expect(screen.getByText("已恢復配圖任務；插入前請重新選擇目前正文中的段落。")).toBeInTheDocument();
    const select = screen.getByLabelText("插入位置") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: select.options[1].value } }); expect(insert).toBeEnabled();
  });
  it("restores a matching planned snapshot using original backend paragraph ids", async () => {
    sessionStorage.setItem("ai-image:p1", "job1");
    const paragraphs = [{ id: "heading-original", tag: "h2", text: "Heading" }, { id: "paragraph-original", tag: "p", text: "Original paragraph" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...planned, paragraphs })));
    vi.stubGlobal("fetch", fetchMock); fixture(); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    const generate = await screen.findByRole("button", { name: "生成圖片" });
    expect(generate).toBeDisabled();
    fireEvent.change(screen.getByLabelText("插入位置"), { target: { value: "paragraph-original" } });
    expect(generate).toBeEnabled(); fireEvent.click(generate);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).targetId).toBe("paragraph-original");
  });
  it("requires reanalysis when recovered planned content differs", async () => {
    sessionStorage.setItem("ai-image:p1", "job1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...planned, paragraphs: [{ id: "old", tag: "p", text: "Old paragraph" }] }))));
    fixture(); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    expect(await screen.findByRole("button", { name: "生成圖片" })).toBeDisabled();
    expect(screen.getByText("正文與原配圖方案不同，請重新分析正文後再生成圖片。")).toBeInTheDocument();
    expect((screen.getByLabelText("插入位置") as HTMLSelectElement).options).toHaveLength(1);
  });
  it("continues polling GENERATED and blocks new analysis while upload is pending", async () => {
    vi.useFakeTimers(); sessionStorage.setItem("ai-image:p1", "job1");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ...planned, status: "GENERATED" }))).mockResolvedValueOnce(new Response(JSON.stringify({ ...planned, status: "READY", publicUrl: "https://media.example.com/a.webp" })));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => { fixture(); }); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" }));
    expect(screen.getByRole("button", { name: "重新分析正文" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "重試上傳已生成圖片" })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "重新分析正文" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "插入正文" })).toBeInTheDocument();
  });
  it("normalizes a freshly typed first line and includes div paragraphs and pre context", async () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {})); vi.stubGlobal("fetch", fetchMock);
    const { container } = fixture();
    const editor = container.querySelector('[contenteditable="true"]')!;
    editor.innerHTML = "First typed line<div>Next line</div><pre>Example code</pre><script>ignore</script>";
    fireEvent.input(editor); fireEvent.click(screen.getByRole("button", { name: "AI 配圖" })); fireEvent.click(screen.getByRole("button", { name: "分析標題與正文" }));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.paragraphs.map((item: {tag: string}) => item.tag)).toEqual(["p", "div", "pre"]);
    expect(editor.firstElementChild?.outerHTML).toBe("<p>First typed line</p>");
    expect((container.querySelector('[name="contentHtml"]') as HTMLInputElement).value).toContain("<p>First typed line</p>");
    const anchors = captureImageParagraphs(editor as HTMLElement);
    expect(insertGeneratedImage(editor as HTMLElement, anchors[1], { publicUrl: "https://example.com/i.png", alt: "Illustration", width: 512, height: 912 })).toBe(true);
    expect(insertGeneratedImage(editor as HTMLElement, anchors[2], { publicUrl: "https://example.com/i.png", alt: "Illustration", width: 512, height: 912 })).toBe(false);
  });
  it("rejects a replaced element even if its text is identical", () => {
    const editor = document.createElement("div"); editor.innerHTML = "<p>Same text</p>";
    const [anchor] = captureImageParagraphs(editor); editor.innerHTML = "<p>Same text</p>";
    expect(insertGeneratedImage(editor, anchor, { publicUrl: "https://example.com/i.png", alt: "", width: 1, height: 1 })).toBe(false);
  });
});
