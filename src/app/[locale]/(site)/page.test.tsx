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

  it("presents the latest answers as a readable list and uses the revised hero copy", async () => {
    listPublishedPosts.mockResolvedValueOnce([
      {
        id: "post-1", slug: "guide-1", title: "第一篇教學", excerpt: "快速解決問題", publishedAt: new Date("2026-09-03T00:00:00Z"),
        category: { name: "AI", slug: "ai", parent: null },
      },
      {
        id: "post-2", slug: "guide-2", title: "第二篇教學", excerpt: "另一個解法", publishedAt: new Date("2026-09-02T00:00:00Z"),
        category: { name: "軟體", slug: "software", parent: null },
      },
    ]);
    listPublishedRootCategories.mockResolvedValueOnce([]);

    render(await HomePage({ params: Promise.resolve({ locale: "zh-tw" }) }));

    expect(screen.getByRole("heading", { name: "把複雜的科技問題，變成做得到的步驟。" })).toBeInTheDocument();
    expect(screen.getByText("從 AI、軟體到社群與 3C，1Wiki 用繁體中文整理清楚背景、步驟與常見解法，讓你少走一點彎路。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "先選一個你想解決的主題" })).toBeInTheDocument();
    expect(screen.getByTestId("latest-answers")).toHaveClass("article-list");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
