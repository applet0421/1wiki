import { describe, expect, it } from "vitest";
import { buildAdsTxt } from "@/lib/adsense/ads-txt";

describe("ads.txt", () => {
  it("outputs the configured Google publisher record", () => {
    expect(buildAdsTxt("pub-1234567890123456")).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  });

  it("rejects missing and malformed publisher IDs", () => {
    expect(buildAdsTxt("")).toBeNull();
    expect(buildAdsTxt("ca-pub-123")).toBeNull();
  });
});
