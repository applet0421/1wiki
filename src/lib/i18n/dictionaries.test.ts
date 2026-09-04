import { describe, expect, it } from "vitest";
import { supportedLocales } from "./config";
import { getDictionary } from "./dictionaries";

describe("locale dictionaries", () => {
  it.each(supportedLocales)("provides the complete shell for %s", (locale) => {
    const dictionary = getDictionary(locale);
    expect(dictionary.site.name).toBeTruthy();
    expect(dictionary.navigation.language).toBeTruthy();
    expect(dictionary.home.emptyTitle).toBeTruthy();
    expect(dictionary.article.readMore).toBeTruthy();
  });

  it("provides native empty states for English and Japanese", () => {
    expect(getDictionary("en").home.emptyTitle).toBe("Content coming soon");
    expect(getDictionary("ja").home.emptyTitle).toBe("コンテンツを準備中です");
  });
});
