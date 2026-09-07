import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web manifest", () => {
  it("publishes raster and vector brand icons", () => {
    expect(manifest().icons).toEqual([
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { src: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ]);
  });
});
