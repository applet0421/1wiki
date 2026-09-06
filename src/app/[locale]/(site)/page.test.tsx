import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const { listPublishedPosts, listPublishedRootCategories } = vi.hoisted(() => ({
  listPublishedPosts: vi.fn(),
  listPublishedRootCategories: vi.fn(),
}));

vi.mock("@/lib/content/repository", () => ({ listPublishedPosts, listPublishedRootCategories }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

describe("HomePage", () => {
  it("shows only root category cards with canonical category URLs", async () => {
    listPublishedPosts.mockResolvedValueOnce([{
      id: "post", slug: "guide", title: "Guide", excerpt: "Intro", publishedAt: new Date("2026-09-03T00:00:00Z"),
      category: { name: "ChatGPT", slug: "chatgpt", parent: { name: "AI", slug: "ai", parent: null } },
    }]);
    listPublishedRootCategories.mockResolvedValueOnce([{
      id: "root", name: "AI", slug: "ai", description: "AI guides", publishedPostCount: 1,
    }]);

    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.getByRole("link", { name: /AI/ })).toHaveAttribute("href", "/zh-tw/category/ai");
    expect(screen.queryByRole("heading", { name: "ChatGPT" })).not.toBeInTheDocument();
  });
});
