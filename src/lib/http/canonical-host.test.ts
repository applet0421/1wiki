import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalHostRedirect } from "./canonical-host";

describe("canonicalHostRedirect", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the canonical URL for the non-www production host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test");
    const request = new Request("https://example.test/zh-tw/articles/line-not-notification-fix?from=search");

    expect(canonicalHostRedirect(request)).toBe(
      "https://www.example.test/zh-tw/articles/line-not-notification-fix?from=search",
    );
  });

  it("does not redirect the canonical host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test");
    const request = new Request("https://www.example.test/zh-tw/articles/line-not-notification-fix");

    expect(canonicalHostRedirect(request)).toBeNull();
  });
});
