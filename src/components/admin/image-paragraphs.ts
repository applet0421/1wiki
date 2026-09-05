export type ImageParagraph = { id: string; text: string; tag: string };
export type ParagraphAnchor = ImageParagraph & { element: Element; html: string };
export function captureImageParagraphs(editor: HTMLElement): ParagraphAnchor[] {
  // Browsers leave the first typed line as a root text node in contentEditable.
  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const paragraph = document.createElement("p");
    node.before(paragraph); paragraph.append(node);
  }
  const supportedTags = new Set(["p", "h2", "h3", "ul", "ol", "blockquote", "div", "pre"]);
  return Array.from(editor.children).filter((element) => supportedTags.has(element.tagName.toLowerCase()) && element.textContent?.trim()).map((element) => ({
    id: crypto.randomUUID(), text: element.textContent!.trim(), tag: element.tagName.toLowerCase(), element, html: element.innerHTML,
  }));
}
export function isImageTarget(paragraph: ImageParagraph) { return ["p", "ul", "ol", "blockquote", "div"].includes(paragraph.tag); }
export function validImageAnchor(editor: HTMLElement, anchor: ParagraphAnchor | undefined): anchor is ParagraphAnchor {
  return !!anchor && anchor.element.parentElement === editor && anchor.element.innerHTML === anchor.html && isImageTarget(anchor);
}
export function insertGeneratedImage(editor: HTMLElement, anchor: ParagraphAnchor | undefined, image: { publicUrl: string; alt: string; width: number | null; height: number | null }) {
  if (!validImageAnchor(editor, anchor)) return false;
  const node = document.createElement("img");
  node.src = image.publicUrl;
  node.alt = image.alt;
  if (image.width) node.width = image.width;
  if (image.height) node.height = image.height;
  anchor.element.after(node);
  return true;
}
