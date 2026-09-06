import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { getPublishedCategoryPosts } = vi.hoisted(() => ({ getPublishedCategoryPosts: vi.fn() }));

vi.mock("@/lib/content/repository", () => ({ getPublishedCategoryPosts }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

describe("category posts API", () => {
  it("marks public pagination responses as shared short-lived cacheable", async () => {
    getPublishedCategoryPosts.mockResolvedValueOnce({ posts: [], total: 0 });

    const response = await GET(new Request("http://localhost/api/categories/posts?locale=zh-tw&path=ai"));

    expect(response.headers.get("Cache-Control")).toBe("public, s-maxage=30, stale-while-revalidate=300");
  });
});
