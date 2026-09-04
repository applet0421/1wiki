"use client";

import { useMemo, useRef, useState } from "react";

type RichTextEditorProps = {
  initialHtml?: string;
  inputName?: string;
  ariaLabel?: string;
  onHtmlChange?: (html: string) => void;
};

export function RichTextEditor({ initialHtml = "", inputName = "contentHtml", ariaLabel = "文章正文", onHtmlChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialMarkup = useMemo(() => ({ __html: initialHtml }), [initialHtml]);
  const [html, setHtml] = useState(initialHtml);
  function updateHtml(nextHtml: string) { setHtml(nextHtml); onHtmlChange?.(nextHtml); }
  function command(name: string, value?: string) { editorRef.current?.focus(); document.execCommand(name, false, value); updateHtml(editorRef.current?.innerHTML || ""); }
  function addLink() { const url = window.prompt("請輸入 http:// 或 https:// 開頭的連結"); if (url?.startsWith("https://") || url?.startsWith("http://")) command("createLink", url); }
  return <div className="editor-frame">
    <div className="editor-toolbar" role="toolbar" aria-label="文章格式">
      <button type="button" onClick={() => command("formatBlock", "p")}>段落</button><button type="button" onClick={() => command("formatBlock", "h2")}>H2</button><button type="button" onClick={() => command("formatBlock", "h3")}>H3</button><button type="button" onClick={() => command("bold")}><strong>粗體</strong></button><button type="button" onClick={() => command("italic")}><em>斜體</em></button><button type="button" onClick={() => command("underline")}><u>底線</u></button><button type="button" onClick={addLink}>連結</button><button type="button" onClick={() => command("insertUnorderedList")}>項目</button><button type="button" onClick={() => command("insertOrderedList")}>編號</button>
    </div>
    <div ref={editorRef} className="rich-editor article-prose" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={initialMarkup} onInput={(event) => updateHtml(event.currentTarget.innerHTML)} aria-label={ariaLabel} />
    {inputName ? <input type="hidden" name={inputName} value={html} /> : null}
  </div>;
}
