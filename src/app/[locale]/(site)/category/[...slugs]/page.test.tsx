import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CategoryPage, { generateMetadata } from "./page";

const { getPublishedCategoryTreePage, notFound } = vi.hoisted(() => ({
  getPublishedCategoryTreePage: vi.fn(),
  notFound: vi.fn(() => { throw new Error("notFound"); }),
}));

vi.mock("@/lib/content/repository", () => ({ getPublishedCategoryTreePage }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/navigation", () => ({ notFound }));

const data = {
  category: { id: "child", name: "ChatGPT", slug: "chatgpt", description: "Guides" },
  ancestors: [{ id: "root", name: "AI", slug: "ai" }],
  children: [],
  posts: [],
};

describe("hierarchical category route", () => {
  it("loads and renders a complete category path", async () => {
    getPublishedCategoryTreePage.mockResolvedValue(data);
    render(await CategoryPage({ params: Promise.resolve({ locale: "zh-tw", slugs: ["ai", "chatgpt"] }) }));

    expect(getPublishedCategoryTreePage).toHaveBeenCalledWith({}, "zh-tw", ["ai", "chatgpt"]);
    expect(screen.getByRole("heading", { name: "ChatGPT" })).toBeInTheDocument();
  });

  it("emits the canonical hierarchical URL", async () => {
    getPublishedCategoryTreePage.mockResolvedValue(data);
    await expect(generateMetadata({ params: Promise.resolve({ locale: "zh-tw", slugs: ["ai", "chatgpt"] }) }))
      .resolves.toMatchObject({ alternates: { canonical: "/zh-tw/category/ai/chatgpt" } });
  });
});
