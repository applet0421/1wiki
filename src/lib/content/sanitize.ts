import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "div",
  "h2",
  "h3",
  "strong",
  "em",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "br",
  "figure",
  "figcaption",
  "img",
  "iframe",
];

const allowedArticleClasses = new Set([
  "article-callout",
  "article-callout-warning",
  "article-steps",
  "article-image",
  "article-image-standard",
  "article-image-narrow",
]);

function allowedClass(value: string | undefined) {
  const filtered = (value || "").split(/\s+/u).filter((name) => allowedArticleClasses.has(name));
  return filtered.length ? filtered.join(" ") : undefined;
}

function articleClassAttributes(attribs: Record<string, string>) {
  const className = allowedClass(attribs.class);
  const { class: _className, ...rest } = attribs;
  return className ? { ...rest, class: className } : rest;
}

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      div: ["class"],
      ol: ["class"],
      figure: ["class"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "title", "loading", "allow", "allowfullscreen", "class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowedIframeHostnames: ["www.youtube-nocookie.com"],
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "ins"],
    transformTags: {
      b: "strong",
      i: "em",
      div: (tagName, attribs) => ({ tagName, attribs: articleClassAttributes(attribs) }),
      ol: (tagName, attribs) => ({ tagName, attribs: articleClassAttributes(attribs) }),
      figure: (tagName, attribs) => ({ tagName, attribs: articleClassAttributes(attribs) }),
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank"
            ? { rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  });
}
