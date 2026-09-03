import { load } from "cheerio";

export type ArticleSegments = {
  introHtml: string;
  bodySegments: string[];
  midAdAfterIndex: number | null;
  visibleCharacterCount: number;
};

function countVisibleCharacters(html: string): number {
  const $ = load(html, null, false);
  return $.root().text().replace(/\s/gu, "").length;
}

export function segmentArticle(html: string): ArticleSegments {
  const $ = load(html, null, false);
  const nodes = $.root().contents().toArray();
  const firstH2 = nodes.findIndex(
    (node) => node.type === "tag" && node.name.toLowerCase() === "h2",
  );

  const introNodes = firstH2 === -1 ? nodes.slice(0, 2) : nodes.slice(0, firstH2);
  const remainingNodes = firstH2 === -1 ? nodes.slice(2) : nodes.slice(firstH2);
  const introHtml = introNodes.map((node) => $.html(node)).join("");
  const bodySegments: string[] = [];
  let current = "";

  for (const node of remainingNodes) {
    const nodeHtml = $.html(node);
    const startsSection = node.type === "tag" && node.name.toLowerCase() === "h2";
    if (startsSection && current) {
      bodySegments.push(current);
      current = "";
    }
    current += nodeHtml;
  }
  if (current) bodySegments.push(current);

  const visibleCharacterCount = countVisibleCharacters(html);
  let midAdAfterIndex: number | null = null;

  if (visibleCharacterCount >= 1200 && bodySegments.length >= 2) {
    const target = visibleCharacterCount * 0.45;
    let cumulative = countVisibleCharacters(introHtml);
    let smallestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < bodySegments.length - 1; index += 1) {
      cumulative += countVisibleCharacters(bodySegments[index]);
      const distance = Math.abs(target - cumulative);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        midAdAfterIndex = index;
      }
    }
  }

  return { introHtml, bodySegments, midAdAfterIndex, visibleCharacterCount };
}
