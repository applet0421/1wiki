import { expect, it } from "vitest";
import { imagePlanInputSchema } from "./image-jobs-schema";
const article = { title: "最新標題", locale: "zh-tw", paragraphs: [{ id: "p1", text: "新的未儲存段落", tag: "p" }] };
it("accepts unsaved article context but rejects headings-only and duplicate anchors", () => {
  expect(imagePlanInputSchema.parse(article)).toEqual(article);
  expect(imagePlanInputSchema.safeParse({ ...article, paragraphs: [{ ...article.paragraphs[0], tag: "h2" }] }).success).toBe(false);
  expect(imagePlanInputSchema.safeParse({ ...article, paragraphs: [...article.paragraphs, ...article.paragraphs] }).success).toBe(false);
});
