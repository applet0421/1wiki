import { describe, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

import { POST } from "./route";

describe("internal cache revalidation route", () => {
  it("rejects requests without the internal secret", async () => {
    process.env.CACHE_REVALIDATE_SECRET = "cache-secret";
    const response = await POST(new Request("http://localhost/api/internal/cache/revalidate", {
      method: "POST",
      body: JSON.stringify({ paths: ["/zh-tw"] }),
    }));
    expect(response.status).toBe(401);
  });

  it("revalidates a bounded, deduplicated path list", async () => {
    process.env.CACHE_REVALIDATE_SECRET = "cache-secret";
    const response = await POST(new Request("http://localhost/api/internal/cache/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer cache-secret" },
      body: JSON.stringify({ paths: ["/zh-tw", "/zh-tw", "/sitemap.xml"] }),
    }));
    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/zh-tw");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });
});
