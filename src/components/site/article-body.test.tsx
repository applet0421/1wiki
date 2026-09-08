import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleBody } from "./article-body";

const env = {
  NODE_ENV: "production", NEXT_PUBLIC_ADSENSE_ENABLED: "true", NEXT_PUBLIC_ADSENSE_CLIENT_ID: "ca-pub-123",
  NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_AFTER_INTRO: "101", NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID: "102", NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END: "103",
};

describe("ArticleBody", () => {
  it("renders at most three body slots in placement order", () => {
    const html = `<p>${"導".repeat(200)}</p><h2>一</h2><p>${"甲".repeat(600)}</p><h2>二</h2><p>${"乙".repeat(600)}</p><h2>三</h2><p>${"丙".repeat(600)}</p>`;
    render(<ArticleBody html={html} pathname="/zh-tw/articles/long" adEnvironment={env} />);
    expect(screen.getAllByTestId(/adsense-/).map((node) => node.dataset.adPlacement)).toEqual(["article_after_intro", "article_mid", "article_end"]);
  });

  it("omits article_mid for short content", () => {
    const html = `<p>${"導".repeat(399)}</p><h2>一</h2><p>${"甲".repeat(400)}</p><h2>二</h2><p>${"乙".repeat(398)}</p>`;
    render(<ArticleBody html={html} pathname="/en/articles/short" adEnvironment={env} />);
    expect(screen.queryByTestId("adsense-article_mid")).not.toBeInTheDocument();
    expect(screen.getByTestId("adsense-article_after_intro")).toBeInTheDocument();
    expect(screen.getByTestId("adsense-article_end")).toBeInTheDocument();
  });

  it("inserts a configured number of middle ads at H2 section intervals", () => {
    const html = `<p>${"導".repeat(200)}</p>${["一", "二", "三", "四", "五", "六", "七"].map((heading) => `<h2>${heading}</h2><p>${"文".repeat(300)}</p>`).join("")}`;

    render(<ArticleBody html={html} pathname="/zh-tw/articles/long" adEnvironment={env} adInsertionRules={{ middleAdInterval: 2, maxMiddleAds: 3 }} />);

    expect(screen.getAllByTestId(/adsense-article_mid/)).toHaveLength(3);
  });
});
