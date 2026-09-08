import { load } from "cheerio";

export type ArticleSegments = {
  introHtml: string;
  bodySegments: string[];
  midAdAfterIndex: number | null;
  midAdAfterIndexes: number[];
  visibleCharacterCount: number;
};

export type ArticleAdInsertionRules = {
  middleAdInterval: number;
  maxMiddleAds: number;
};

export function validateArticleAdInsertionRules(rules: ArticleAdInsertionRules) {
  if (!Number.isInteger(rules.middleAdInterval) || rules.middleAdInterval < 1 || rules.middleAdInterval > 6) {
    throw new Error("middleAdInterval 必須是 1 至 6 的整數");
  }
  if (!Number.isInteger(rules.maxMiddleAds) || rules.maxMiddleAds < 0 || rules.maxMiddleAds > 5) {
    throw new Error("maxMiddleAds 必須是 0 至 5 的整數");
  }
  return rules;
}

function countVisibleCharacters(html: string): number {
  const $ = load(html, null, false);
  return $.root().text().replace(/\s/gu, "").length;
}

export function segmentArticle(html: string, rules?: ArticleAdInsertionRules): ArticleSegments {
  if (rules) validateArticleAdInsertionRules(rules);
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

  const midAdAfterIndexes = rules && visibleCharacterCount >= 1200
    ? bodySegments.slice(0, -1).flatMap((_segment, index) => (index + 1) % rules.middleAdInterval === 0 ? [index] : []).slice(0, rules.maxMiddleAds)
    : midAdAfterIndex === null ? [] : [midAdAfterIndex];

  return { introHtml, bodySegments, midAdAfterIndex, midAdAfterIndexes, visibleCharacterCount };
}
